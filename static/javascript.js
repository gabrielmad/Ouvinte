/*****************************************************************************
Just insert the following code to your web page:

-----8<-----
<script language="JavaScript" src="http://ouvinte.net/javascript"></script>
----->8-----

Optionally, you can configure the Acessibility Bar:

-----8<-----
<script language="JavaScript">
  OuvinteTextActive   = "<img src='x.gif' alt='Active accessibility' />";
  OuvinteTextDeactive = "<img src='y.gif' alt='Deactive accessibility' />";
  OuvinteContentText  = "Skip to main content";
  OuvinteContentID    = ["content"];
  ShowOuvinteBar      = false;
</script>
----->8-----
*****************************************************************************/


/***********************

 Default config values
 
***********************/

var server           = 'http://localhost';
var flashURL         = server + "/OuvintePlayer.swf";
var serverURL        = server + ":3000/mp3/";
var serverURLContent = server + ":3000/content/";

var translateElem = new Array();
translateElem['a']          = "link";
translateElem['text']       = "caixa de texto";
translateElem['password']   = "campo senha";
translateElem['radio']      = "campo rádio";
translateElem['checkbox']   = "caixa de checagem";
translateElem['image']      = "botão imagem";
translateElem['reset']      = "botão redefinir";
translateElem['submit']     = "botão de envio";
translateElem['select']     = "lista de opções";
translateElem['select-one'] = "seleção única";
translateElem['option']     = "opção";
translateElem['value']      = "valor";
translateElem['nolabel']    = "sem legenda";

var ShowOuvinteBar      = true;
var OuvinteContentID    = ["content"];
var OuvinteContentText  = "<img src='" + server + "/skip.png' alt='Ir ao conteúdo principal' border='0' />";
var OuvinteTextActive   = "<img src='" + server + "/active.png' alt='Ativar acessibilidade' border='0' />";
var OuvinteTextDeactive = "<img src='" + server + "/deactive.png' alt='Desativar acessibilidade' border='0' />";

var swfObj = "OuvinteSWF";

/**********************************

 NO MORE CONFIGURATIONS FROM HERE

**********************************/

var ouvinte;
var focus;

// Creates XMLHttp object
var http = navigator.appName.indexOf ("Microsoft") != -1 ?
           new ActiveXObject("Microsoft.XMLHTTP") :
           new XMLHttpRequest();

onload = function () {
  checkOuvinteCookie();             // loads cookies
  checkOuvinteBar();                // generates top bar and player
  checkOuvinteElem();               // gives links extra attributes and func
  checkOuvinteMainContent();
  if (document.addEventListener)    // listen to focused elements
    document.addEventListener( 'focus', onElementFocused, true );
}

// Checks if acessibility is (dis|en)abled
function checkOuvinteCookie(){
  var temp = document.cookie.match( '(^|;)\s*ouvintenet\s*=\s*(.*?)\s*(;|$)' );
  ouvinte  = temp ? ( temp[2] == 'true' ? true : false ) : false ;
}

// Toggles Ouvinte activity
function OuvinteToggle(e) {
  ouvinte     = ouvinte ? false : true ;   // Toogles ouvinte var value
  e.innerHTML = ouvinte                    // And (dis|en)able element content
                ? OuvinteTextDeactive
                : OuvinteTextActive ;
  if ( !ouvinte ) OuvintePlayer().stop();  // If desabled, stops sounds
  document.cookie = "ouvintenet=" + ouvinte +
                    ";expires="   + new Date( 2050, 12, 31 ).toGMTString();
  checkOuvinteElem([e]);                   // Updates element attributes
}

function checkOuvinteElem(list) {
  if ( !list ) list = document.getElementsByTagName('a');
  for ( var i = 0, e; e = list[i]; i++ ) createAttFocusBlur(e);
}

function createAttFocusBlur(e) {
  if ( e.tagName == 'SELECT' )                   // If a SELECT element
    createAttFocusBlurForChildren(e,'option');   // call to each OPTION

  var txt;
  if ( e.tagName == 'INPUT'         ||           // If INPUT field,
       e.tagName == 'TEXTAREA'      ||           // TEXTAREA
       e.tagName == 'SELECT' )                   // or SELECT
    if ( e.type.toLowerCase() == 'submit' )      // If a submit
      txt = e.value                 ||           // gets it's value
            translateElem['nolabel'];
    else                                         // If not
      txt = labelTxt(e)             ||           // Gets it's Label
            e.getAttribute('alt')   ||           // or other text
            e.getAttribute('title') ||
            translateElem['nolabel'];
  else
    txt = e.textContent             ||           // else catchs textual content
          e.innerText               ||           // other ways
          e.getAttribute('alt')     ||
          e.getAttribute('title');

  if ( !txt ) {                                  // if none
    var img = e.getElementsByTagName('img')[0];  // looks for the first img element
    if ( img ) txt = img.getAttribute('alt');    // if found gets it's alt attr
  }
  if ( !txt ) return;                            // if nothing again, go back

  var tmp = txt.replace(/^\s+|\s+$/g,"")         // trim text content
               .replace(/\s+/g," ");             // concacts spaces

  if ( !tmp ||                                   // Nothing
       !isMainContent( e.id ) &&                 // or not a main content
       tmp.length > 50 ) return;                 // and is too big? go back!

  createAttributes(e,tmp);                       // generates extra attributes
  createOnFocusOnBlur(e);                        // generates extra behaviors
}

function createAttFocusBlurForChildren(e,tag){
  var options = e.getElementsByTagName(tag);
  for ( var i = 0, j; j = options[i]; i++ )
    createAttFocusBlur( j );
}

function createAttributes(e,tmp) {
  e.setAttribute(  'md5', hex_md5(tmp.toLowerCase()) );
  e.setAttribute( 'sha1', hex_sha1(tmp.toLowerCase()) );
  e.setAttribute(  'tmp', Base64.encode( isMainContent( e.id ) ? e.innerHTML : tmp.toLowerCase()) );	
}

function createOnFocusOnBlur(e) {

  e.onfocus = function() {

    if (focus != this) {

      focus    = this;
      var obj  = this;
      var type = false;

      if ( this.tagName == 'INPUT' ||  // If a INPUT
           this.tagName == 'SELECT' )  // or SELECT
        type = translateElem[e.type];  // tell its type

//      obj = this.options[this.selectedIndex];

      if ( obj.getAttribute('tmp') && ( ouvinte || obj.getAttribute('id') == "OuvinteToggleLink" ) && OuvintePlayer() ) {

        var audio = serverURL
                    + obj.getAttribute('md5')  + '/'
                    + obj.getAttribute('sha1') + '/'
                    + (isMainContent( e.id ) ? 'content' : obj.getAttribute('tmp'));

        if ( isMainContent( e.id ) )
          OuvintePlayer().onError( 'contentAudio("' + obj.getAttribute('tmp')  + '","' + audio + '");' );

        if ( type ) {
          var typeAudio =  serverURL
                           + hex_md5( type )  + '/'
                           + hex_sha1( type ) + '/'
                           + Base64.encode( type );

          OuvintePlayer().loadAndPlay( typeAudio );
          OuvintePlayer().setPlayList( 'OuvintePlayer().loadAndPlay("' + audio + '")' );
        }
        else
          OuvintePlayer().loadAndPlay( audio );
      }
    }
  }
  e.onblur  = function() { if ( OuvintePlayer() ) OuvintePlayer().stop() }
}

// Ajax POST request to generate main content audio
function contentAudio( content, audio ) {
  OuvintePlayer().onError();                 // Unset onError 

  http.open('POST', serverURLContent, true); // opens a POST connection
  http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

  http.onreadystatechange = function() {     // On Ready Event
    if( http.readyState == 4 )               // If pages loads
      OuvintePlayer().loadAndPlay( audio );  // loads audio again, and play
  }

  http.send( 'content=' + content );         // content to audio generation
}

function checkOuvinteBar() {

  // Seleciona a tag body e cria a div da barra de acessibilidade
  var body = document.body;
  var div  = document.createElement('div');

  // Dimensões do player
  var playerWidth = 180;
  var playerHeight = 16;

  // Caso não seja para exibir o menu
  if ( !ShowOuvinteBar ) {
    div.style.visibility = 'hidden';
    playerWidth  = 0;
    playerHeight = 0;
  } else {
    // Cria o link que pula diretamente ao conteúdo principal
    var contentLink       = document.createElement('a');
    contentLink.href      = '#' + OuvinteContentID[0];
    contentLink.innerHTML = OuvinteContentText;
    contentLink.setAttribute('onclick', 'focusElement(OuvinteContentID[0]); if (ouvinte) return false;');

    // Cria o link que ativa e desativa a acessibilidade
    var toogleLink        = document.createElement('a');
    toogleLink.href       = 'javascript:void(0)';
    toogleLink.innerHTML  = ouvinte ? OuvinteTextDeactive : OuvinteTextActive ;
    toogleLink.setAttribute('id',"OuvinteToggleLink");
    toogleLink.setAttribute('onclick',"OuvinteToggle(this)");

    // Adiciona os links ao div
    div.appendChild(contentLink);
    div.appendChild(toogleLink);
  }
  /*
  // HTML5 Audio Tag
  var HTML5player = document.createElement('audio');
  HTML5player.setAttribute('controls','controls');
  HTML5player.setAttribute('autobuffer','autobuffer');   // if ativo
  HTML5player.setAttribute('width',playerWidth);
  HTML5player.setAttribute('height',playerHeight);

  // Ogg Source
  var OggSrc = document.createElement('source');
  OggSrc.setAttribute('src','http://www.vapaa.com.br/teste.ogg');
  HTML5player.appendChild(OggSrc);

  // MP3 Source
  var MP3Src = document.createElement('source');
  MP3Src.setAttribute('src','http://www.vapaa.com.br/test2.wav.mp3');
  HTML5player.appendChild(MP3Src);
  */
  // Flash Object
  var flashObj = document.createElement('embed');
  flashObj.setAttribute('name',swfObj);
  flashObj.setAttribute('id',swfObj);
  flashObj.setAttribute('width',playerWidth);
  flashObj.setAttribute('height',playerHeight);
  flashObj.setAttribute('wmode','transparent');
  flashObj.setAttribute('src',flashURL);
  flashObj.setAttribute('type','application/x-shockwave-flash');
  flashObj.setAttribute('swliveconnect','true');
  /*
  HTML5player.appendChild(flashObj);

  // Adiciona o player ao div
  div.appendChild(HTML5player);
  */
  div.appendChild(flashObj);

  // Insere o div no topo da página
  if ( ShowOuvinteBar )
    body.insertBefore(div,body.firstChild)
  else
    body.appendChild(div)
}

function OuvintePlayer() {

	var swf = navigator.appName.indexOf ("Microsoft") != -1
		  ? window[swfObj]
		  : document[swfObj] ;

	if ( swf && swf.PercentLoaded() && swf.PercentLoaded() != 100 ) return;

	this.play = function () {
		swf.TCallLabel('/','play')
	}

	this.stop = function () {
		swf.TCallLabel('/','stop')
	}

	this.pause = function () {
		swf.TCallLabel('/','pause')
	}

	this.playToggle = function () {
		swf.TCallLabel('/','playToggle')
	}

	this.reset = function () {
		swf.TCallLabel('/','reset')
	}

	this.load = function (url) {
		swf.SetVariable('audio_id',url)
	        swf.TCallLabel('/','load');
	}

	this.loadAndPlay = function (url) {
		this.load(url);
		this.play();
		this.setPlayList();
	}

	this.setPlayList = function (value) {
		swf.SetVariable('onSongOver', value );
	};

	this.onError = function (value) {
		swf.SetVariable('onError', value );
	};
	return this;
}

function onElementFocused(e){
  if (e && e.target) {
    var t = e.target;
    if ( t.getAttribute && !t.getAttribute('tmp') )
      createAttFocusBlur( t, t.innerHTML );
  }
} 

function labelTxt(id) {
  var lbl;
  if( pid = id.parentNode )
    if ( pid.tagName == 'label' )
      lbl = pid;
    else {
      var lbls = document.getElementsByTagName('label');
      for( var i = 0; i < lbls.length; i++ )
        if ( lbls[i].htmlFor == id.id )
          lbl = lbls[i];
    }
  
  return lbl ?
         lbl.textContent ||
         lbl.innerText :
         false;
}

// Checks if Element ID is of an Main Content
function isMainContent ( id ) {
  for ( var i = 0, j; j = OuvinteContentID[i]; i++ )
    if ( id == j ) return true;
  return false;
}

function checkOuvinteMainContent() {

  for ( var i = 0, j; j = OuvinteContentID[i]; i++ ){
    var e = document.getElementById( j );
    if ( e && !e.getAttribute('tabindex') )
      e.setAttribute('tabindex','0');
  }
}

function focusElement (id){
  document.location.href = '#' + id;
  var e = document.getElementById(id);
  if ( e ) {
    e.focus();
  }
}

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*  EDITED: Gabriel Vieira (http://www.vapaa.com.br/)
*
**/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2))
				enc3 = enc4 = 64;
			else if (isNaN(chr3))
				enc4 = 64;
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output.replace(/\=/g,'');
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	}
}


/**
*
*  MD5 (Message-Digest Algorithm)
*  http://www.webtoolkit.info/
*
**/
 
function hex_md5 (string) {
 
	function RotateLeft(lValue, iShiftBits) {
		return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
	}
 
	function AddUnsigned(lX,lY) {
		var lX4,lY4,lX8,lY8,lResult;
		lX8 = (lX & 0x80000000);
		lY8 = (lY & 0x80000000);
		lX4 = (lX & 0x40000000);
		lY4 = (lY & 0x40000000);
		lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
		if (lX4 & lY4) {
			return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
		}
		if (lX4 | lY4) {
			if (lResult & 0x40000000) {
				return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
			} else {
				return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
			}
		} else {
			return (lResult ^ lX8 ^ lY8);
		}
 	}
 
 	function F(x,y,z) { return (x & y) | ((~x) & z); }
 	function G(x,y,z) { return (x & z) | (y & (~z)); }
 	function H(x,y,z) { return (x ^ y ^ z); }
	function I(x,y,z) { return (y ^ (x | (~z))); }
 
	function FF(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function GG(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function HH(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function II(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function ConvertToWordArray(string) {
		var lWordCount;
		var lMessageLength = string.length;
		var lNumberOfWords_temp1=lMessageLength + 8;
		var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
		var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
		var lWordArray=Array(lNumberOfWords-1);
		var lBytePosition = 0;
		var lByteCount = 0;
		while ( lByteCount < lMessageLength ) {
			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
			lByteCount++;
		}
		lWordCount = (lByteCount-(lByteCount % 4))/4;
		lBytePosition = (lByteCount % 4)*8;
		lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
		lWordArray[lNumberOfWords-2] = lMessageLength<<3;
		lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
		return lWordArray;
	};
 
	function WordToHex(lValue) {
		var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
		for (lCount = 0;lCount<=3;lCount++) {
			lByte = (lValue>>>(lCount*8)) & 255;
			WordToHexValue_temp = "0" + lByte.toString(16);
			WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
		}
		return WordToHexValue;
	};
 
	function Utf8Encode(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	};
 
	var x=Array();
	var k,AA,BB,CC,DD,a,b,c,d;
	var S11=7, S12=12, S13=17, S14=22;
	var S21=5, S22=9 , S23=14, S24=20;
	var S31=4, S32=11, S33=16, S34=23;
	var S41=6, S42=10, S43=15, S44=21;
 
	string = Utf8Encode(string);
 
	x = ConvertToWordArray(string);
 
	a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
 
	for (k=0;k<x.length;k+=16) {
		AA=a; BB=b; CC=c; DD=d;
		a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
		d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
		c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
		b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
		a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
		d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
		c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
		b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
		a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
		d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
		c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
		b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
		a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
		d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
		c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
		b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
		a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
		d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
		c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
		b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
		a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
		d=GG(d,a,b,c,x[k+10],S22,0x2441453);
		c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
		b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
		a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
		d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
		c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
		b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
		a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
		d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
		c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
		b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
		a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
		d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
		c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
		b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
		a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
		d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
		c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
		b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
		a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
		d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
		c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
		b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
		a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
		d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
		c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
		b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
		a=II(a,b,c,d,x[k+0], S41,0xF4292244);
		d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
		c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
		b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
		a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
		d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
		c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
		b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
		a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
		d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
		c=II(c,d,a,b,x[k+6], S43,0xA3014314);
		b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
		a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
		d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
		c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
		b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
		a=AddUnsigned(a,AA);
		b=AddUnsigned(b,BB);
		c=AddUnsigned(c,CC);
		d=AddUnsigned(d,DD);
	}
 
	var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
 
	return temp.toLowerCase();
}



/**
*
*  Secure Hash Algorithm (SHA1)
*  http://www.webtoolkit.info/
*
**/
 
function hex_sha1 (string) {
 
	function rotate_left(n,s) {
		var t4 = ( n<<s ) | (n>>>(32-s));
		return t4;
	};
 
	function lsb_hex(val) {
		var str="";
		var i;
		var vh;
		var vl;
 
		for( i=0; i<=6; i+=2 ) {
			vh = (val>>>(i*4+4))&0x0f;
			vl = (val>>>(i*4))&0x0f;
			str += vh.toString(16) + vl.toString(16);
		}
		return str;
	};
 
	function cvt_hex(val) {
		var str="";
		var i;
		var v;
 
		for( i=7; i>=0; i-- ) {
			v = (val>>>(i*4))&0x0f;
			str += v.toString(16);
		}
		return str;
	};
 
 
	function Utf8Encode(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	};
 
	var blockstart;
	var i, j;
	var W = new Array(80);
	var H0 = 0x67452301;
	var H1 = 0xEFCDAB89;
	var H2 = 0x98BADCFE;
	var H3 = 0x10325476;
	var H4 = 0xC3D2E1F0;
	var A, B, C, D, E;
	var temp;
 
	msg = Utf8Encode(string);
 
	var msg_len = msg.length;
 
	var word_array = new Array();
	for( i=0; i<msg_len-3; i+=4 ) {
		j = msg.charCodeAt(i)<<24 | msg.charCodeAt(i+1)<<16 |
		msg.charCodeAt(i+2)<<8 | msg.charCodeAt(i+3);
		word_array.push( j );
	}
 
	switch( msg_len % 4 ) {
		case 0:
			i = 0x080000000;
		break;
		case 1:
			i = msg.charCodeAt(msg_len-1)<<24 | 0x0800000;
		break;
 
		case 2:
			i = msg.charCodeAt(msg_len-2)<<24 | msg.charCodeAt(msg_len-1)<<16 | 0x08000;
		break;
 
		case 3:
			i = msg.charCodeAt(msg_len-3)<<24 | msg.charCodeAt(msg_len-2)<<16 | msg.charCodeAt(msg_len-1)<<8	| 0x80;
		break;
	}
 
	word_array.push( i );
 
	while( (word_array.length % 16) != 14 ) word_array.push( 0 );
 
	word_array.push( msg_len>>>29 );
	word_array.push( (msg_len<<3)&0x0ffffffff );
 
 
	for ( blockstart=0; blockstart<word_array.length; blockstart+=16 ) {
 
		for( i=0; i<16; i++ ) W[i] = word_array[blockstart+i];
		for( i=16; i<=79; i++ ) W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);
 
		A = H0;
		B = H1;
		C = H2;
		D = H3;
		E = H4;
 
		for( i= 0; i<=19; i++ ) {
			temp = (rotate_left(A,5) + ((B&C) | (~B&D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}
 
		for( i=20; i<=39; i++ ) {
			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}
 
		for( i=40; i<=59; i++ ) {
			temp = (rotate_left(A,5) + ((B&C) | (B&D) | (C&D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}
 
		for( i=60; i<=79; i++ ) {
			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}
 
		H0 = (H0 + A) & 0x0ffffffff;
		H1 = (H1 + B) & 0x0ffffffff;
		H2 = (H2 + C) & 0x0ffffffff;
		H3 = (H3 + D) & 0x0ffffffff;
		H4 = (H4 + E) & 0x0ffffffff;
 
	}
 
	var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
 
	return temp.toLowerCase();
 
}