$(document).ready(function(){

	'use strict';


	// Tooltip for flot chart
	function showTooltip(x, y, contents) {
		$('<div id="tooltip" class="tooltipflot">' + contents + '</div>').css( {
			position: 'absolute',
			display: 'none',
			top: y + 5,
			left: x + 5
		}).appendTo('body').fadeIn(200);
	}


});
