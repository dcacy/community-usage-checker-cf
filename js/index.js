/*global document,$,window */



function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}


// $( document ).ready(function() {
	var urlVars = getUrlVars();
	if ( urlVars.err ) {
		document.getElementById('error').innerHTML = 'An error has occurred: ' + decodeURIComponent(urlVars.err);
	}
// });
// $( document ).ready(function() {
// 	var urlVars = getUrlVars();
// 	if ( urlVars.err ) {
// 		$('#error').html('An error has occurred: ' + decodeURIComponent(urlVars.err));
// 	}
// });