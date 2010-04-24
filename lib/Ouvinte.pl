#!/usr/bin/perl

use Mojolicious::Lite;
use Encode;
use MongoDB;
use MongoDB::GridFS;
use HTML::Parser;
use MIME::Base64::URLSafe;
use DateTime;
use IO::File;
use String::ShellQuote;
use Digest::MD5 qw(md5_hex);
use Digest::SHA1 qw(sha1_hex);

################################################################################
# Configurations
my $config = {
    mongodb => {
        host => "localhost",
        port => 27017,
        db   => 'audio',
    },
    espeak => {
        path  => 'espeak',
        voice => 'mb-br1',
    },
    mbrola => {
        use   => 1,
        path  => 'mbrola',
        voice => '/usr/share/mbrola/br1/br1',
    },
    oggenc => {
        use   => 1,
        ext   => ".ogg",
        codec => "ogg",
        cmd   => "oggenc -q -2 {input} -o {output}.ogg",
    },
    lame => {
        use   => 1,
        ext   => ".mp3",
        codec => "mp3",
        cmd   => "lame -q 9 {input} -o {output}.mp3",
    },
    output => {
        ext   => ".wav",
        dir   => "audio_temp/",
        tmp   => "{md5}{sha1}",
        final => "{md5}{sha1}",
    },
    domains => [ qw{ http://localhost } ],
    js_path => '../static/javascript.js',
};

################################################################################
# Makes the temp dir if not exist
mkdir $config->{output}->{dir} unless -d $config->{output}->{dir};

################################################################################
# Connects to MongoDB
my $conn = MongoDB::Connection->new( host => $config->{mongodb}->{host}, port => $config->{mongodb}->{port},);
my $db   = $conn->get_database( $config->{mongodb}->{db} );
my $grid = $db->get_gridfs;

################################################################################
# Returns index content
get '/' => sub {
    shift->render_text("It's alive!");
};

################################################################################
# Returns Javascript code
get '/javascript' => sub {
    my $self = shift;
    my $fh = new IO::File $config->{js_path}, '<';
    my $js = join '', <$fh>;
    $fh->close;
    $self->render_text($js);
};

################################################################################
# Returns the audio content for the asked text
#
# Receives 4 parameters:
# - Audio Codec/Format
# - MD5 HASH
# - SHA-1 HASH
# - Base64 encoded text
#
# From the following kind of URL:
# http://ouvinte.net/ogg/9dc9b53b72552d01a2774c1faad2a61a/0c62cf7809de77beb4f799b48a1d78db3acdd365/QWN0aXZlIEFjZXNzaWJpbGl0eQ
# http://ouvinte.net/mp3/9dc9b53b72552d01a2774c1faad2a61a/0c62cf7809de77beb4f799b48a1d78db3acdd365/QWN0aXZlIEFjZXNzaWJpbGl0eQ
#
# * Which asks for 'Active Acessibility' audio

get '/:codec/:md5/:sha1/:text' => sub {

    my $self  = shift;
    my $codec = $self->stash('codec');
    my $md5   = $self->stash('md5');
    my $sha1  = $self->stash('sha1');
    my $text  = $self->stash('text');

    # Returns if asks for an unsupported file type
    return $self->render_not_found if $codec !~ /^(ogg|mp3)$/;

    # Checks MD5 and SHA-1 given strings
    return $self->render_not_found if $md5 !~ /^([a-z,0-9]){32}$/ or $sha1 !~ /^([a-z,0-9]){40}$/;

    ##############################################
    # Check DB
    if ( my $file = $grid->find_one( { text_id => $md5.$sha1, codec => $codec } ) ) {

        # Gets audio data
        my $audio;
        my $fh = new IO::File \$audio, '>';
        $file->print($fh);

        # Updates downloads count and the date of the last one
        $db->get_collection('fs.files')->update(
             { text_id => $md5.$sha1, codec => $codec },
             {
                 '$inc' => { downloads => 1 },
                 '$set' => { last_access => DateTime->now },
             },{}
         );

        # Returns audio data
        return $self->render_text($audio);
    }

    ##############################################
    # Temp cleaned up text
    my $temp_text = clean_text($text);

    ##############################################
    # Genartes MD5 e SHA-1 Hashs from Temp
    my $digest = {
        'md5'  => md5_hex ( lc $temp_text ),
        'sha1' => sha1_hex( lc $temp_text ),
    };

    # Returns if given HASHs doesn't matches generateds ones
    return $self->render_not_found if $md5 ne $digest->{md5} or $sha1 ne $digest->{sha1};

    ##############################################
    # Treats text for audio generation
    # Inserts a break before a space follower number
    # so won't be readen as part of previous word
    $temp_text =~ s/(\w+)(\s+)(\d+)/$1,$2$3/g;

    # Output file path
    my $output = $config->{output}->{dir} . $config->{output}->{tmp};
    $output =~ s/\{(\w+)\}/$digest->{$1}/g;
    my $out_file = $output . $config->{output}->{ext};

    text_to_speech( shell_quote($temp_text), $out_file ) or $self->render_text($@);
    my $return = convert_audio( $md5.$sha1, { input => $out_file, output => $output }, $codec ) or $self->render_text($@);

    # Returns selected content
    $self->render_text($return)
};

any '/content' => sub {

    my $self = shift;

    return check_domain($self) if lc $self->req->method eq 'options';

    my $content = $self->param('content') or return $self->render_not_found;
    my $temp_text = encode 'utf-8', lc decode 'utf-8', clean_text($content);

    # Generates MD5 and SHA-1 hashs
    my $digest = {
        md5  => md5_hex( $temp_text ),
        sha1 => sha1_hex( $temp_text ),
    };
    my $text_id = $digest->{md5}.$digest->{sha1};

    # First, check DB
    return $self->render_text("ok") if $grid->find_one( { text_id => $text_id } );

    # Output file path
    my $output = $config->{output}->{dir} . $config->{output}->{tmp};
    $output =~ s/\{(\w+)\}/$digest->{$1}/g;
    my $out_file = $output . $config->{output}->{ext};

    # Creates temp file with content
    my $fh = new IO::File $output, '>';
    print $fh clean_text( $content, 1 );
    $fh->close;

    text_to_speech( "-f $output", $out_file ) or $self->render_text($@);
 
    unlink $output;
 
    convert_audio( $text_id, { input => $out_file, output => $output } ) or $self->render_text($@);
    $self->render_text("ok")
};

########################
# Cleans the input text
sub clean_text {

    my $text      = shift;
    my $keep_tags = shift;
    my $temp;
    my $break;
    my $space;

    my $text_elem = sub {
        (my $trim = shift) =~ s/(^\s+|\s+$)//g;
        $trim =~ s/\s+/ /g;
        if ( $trim ) {
                $break = 0;
                return ( $space++ ? ' ' : '' ) . $trim
        }
    };

    my $tag_paragraph = sub {
            if (shift =~ /^(h(\d|r))$/ and !$break){
                    $break = 1;
                    $space = 0;
                    return '<hr>'
            }
    };

    my $tag_sentence = sub {
            if (shift =~ /^(br|li|img|td)$/ and !$break) {
                    $break = 1;
                    $space = 0;
                    return '<br>'
            }
    };

    # Decodes the text
    $text = urlsafe_b64decode($text);

    # Cleans HTML codes and tags
    my $p = HTML::Parser->new(
            text_h  => [ sub { $temp .= $text_elem->(shift) }, 'dtext' ],
            start_h => [ sub { $temp .= $tag_sentence->(shift) if $keep_tags  }, 'tagname' ],
            end_h   => [ sub { $temp .= $tag_paragraph->(shift) if $keep_tags }, 'tagname' ],
    );
    $p->parse( $text );
    $p->eof;

    $temp
}

sub text_to_speech {

    my $text = shift;
    my $file = shift;

    #################################################
    # Generates the command to system call to
    # generate the audio from the given text (Temp)
    my $cmd = $config->{espeak}->{path}  . ' -v ' .
              $config->{espeak}->{voice} . ' -m ' .
              $text;

    # Use MBROLA or just eSpeak?
    $cmd .= $config->{mbrola}->{use} ?
            " -x -q | " . $config->{mbrola}->{path} . " ". $config->{mbrola}->{voice} . " - " :
            " -w ";
    $cmd .= $file;

    # Generates the audio with the configured path
    eval { system($cmd) };
    return 0 if $@
}

sub convert_audio {

    my $hashkey = shift;
    my $in_out  = shift;
    my $codec   = shift;
    my $return;

    #################################################
    # Converts the audio using oggenc and lame
    for my $each (qw( oggenc lame )) {

        # Checks if is to convert to the filetype
        my $program = $config->{$each};
        if ( $program->{use} ) {

            # Converts to the CODEC
            ( my $cmd = $program->{cmd} ) =~ s/\{(\w+)\}/$in_out->{$1}/g;
            eval { system($cmd) };
            return 0 if $@;

            # Inserts in the DB
            my $file_path = $in_out->{output}.$program->{ext};
            my $file      = IO::File->new( $file_path , "r" );

            $grid->insert(
                $file,
                {
                    text_id     => $hashkey,
                    codec       => $program->{codec},
                    downloads   => 1,
                    last_access => DateTime->now,
                }
            );

            # Caches its content to return;
            $return = join '', <$file> if $codec and $codec eq $program->{codec};

            # Closes FH and deletes file
            $file->close;
            unlink $file_path;
        }
    }

    # Deletes the output file
    unlink $in_out->{input};

    $return
}

sub allowed {
    my $domain = shift;
    for (@{$config->{domains}}){
        return 1 if $domain eq $_
    }
    0
}

sub check_domain {
    my $self   = shift;
    my $rqhead = $self->req->headers;
    my $origin = $rqhead->header('Origin');
    my $rqmeth = $rqhead->header('Access-Control-Request-Method');

    return $self->render_not_found if lc $rqmeth ne 'post' or !allowed($origin);

    my $rshead = $self->res->headers;
    $rshead->add( 'Access-Control-Allow-Origin', $origin);
    $rshead->add('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    $rshead->add('Access-Control-Allow-Headers', 'X-PINGARUNER');
    $rshead->add(      'Access-Control-Max-Age', 1728000);
    $self->render_text("ok")
}


shagadelic;
