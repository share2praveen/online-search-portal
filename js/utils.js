// Utility

var utils = {};

// Get time in HH and MM for milliseconds
// @params milliseconds
// @params string 
utils.getTime = function (theMS) {
	if (theMS) {
		var date = new Date(theMS);
		return date.getHours() + ':' + date.getMinutes();
	} else
		return "";		
}

// Get time duration between 2 dates
// @params depatureTime
// @params arrivalTime
// return string
utils.getDuration = function (thedepTime, theArrivalTime) {
	var deptTime = new Date(thedepTime);
	var arrTime = new Date(theArrivalTime);
	var hh = arrTime.getHours() - deptTime.getHours();
	var mm = arrTime.getMinutes() - deptTime.getMinutes();
	return hh + "h " + mm + "m" ;
}