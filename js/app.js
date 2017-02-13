var flightSearchApp = { // app definition
	searchResults: [],

	init: function () {
		$("#price-range").slider();
		this.bindEvents ();
		this.setMinMaxPrice();
		this.searchResults = this.searchForFlightAvailability ('default');
		this.renderSearchResults (this.searchResults);
	},

	bindEvents: function () {
		var self = this;

		$('#departure-date-wrapper, #return-date-wrapper').datepicker({
			startDate: new Date(),
			orientation: "bottom auto",
			autoclose: true
		});

		$('#departure-date-wrapper').datepicker().on ('changeDate', function(e) {
			$('#return-date-wrapper').datepicker('setStartDate', e.date);
		});

		$('#origin, #destination').typeahead({
			highlight: true,  
			source: config.airportList
		});

		$("#price-range").slider().on ('change', function (e) {
			var oldValue = e.value.oldValue;
			var newValue = e.value.newValue;

			if (oldValue[0] !== newValue[0] || oldValue[1] !== newValue[1]) {
				var data = self.filterByPrice({min: newValue[0], max: newValue[1]});
				var msg = data.length ? "" : config.msg.NO_FLIGHT_ON_PRICE;
				self.renderSearchResults (data, msg);
				$("#price-range").slider ('enable');
			}
		});

		$('#swap-city').on ('click', function (e) {
			// not decided
		});

		$('#trip-type a').click(function (e) {

			var type = $(this).attr('data-trip-type');

			$('#submit-request').attr('data-trip-type', type);
			$('#return-date-wrapper').datepicker('update', '');

			if(type === 'return') {
				$('#return-date-wrapper').css('display', 'table');
			} else {
				$('#return-date-wrapper').hide();
			}
		});

		$('#submit-request').on ('click', function () {
			$('#error-alert').hide();

			var searchReq = {};
			searchReq.origin = $('#origin').val().trim();
			searchReq.originCode = searchReq.origin.split(',')[1];
			searchReq.dest = $('#destination').val().trim();
			searchReq.destCode = searchReq.dest.split(',')[1];
			searchReq.depatureDate = $('#departure-date').val().trim();
			searchReq.returnDate = $('#return-date').val().trim();
			searchReq.type = $('#submit-request').attr('data-trip-type');

			if (searchReq.type === "return")
				searchReq.returnDate = $('#return-date').val().trim();

			
			var isValid = self.validateSearchRequest (searchReq);			
			if (isValid === true) {
				self.setMinMaxPrice ();
				self.searchResults = [];
				var searchStats = self.searchForFlightAvailability ('manual', searchReq);
				if (searchStats.status === 'success') 
					self.searchResults = searchStats.data;
				else
					$('#error-alert').text (searchStats.msg);

				self.renderSearchResults (self.searchResults, searchStats.msg);
				self.renderSearchHeader (searchReq);
			} else {
				// show error
				$('#error-alert').text (isValid).show();
			}
		});

		
		$('#search-results').on ('click', '.book-flight', function (e) {
			var flightId = +$(this).attr('data-flight-id');
			for (var i=0, len=self.searchResults.length; i<len; i++) {
				if (flightId === self.searchResults[i].id) {
					self.renderBookingModal (self.searchResults[i]);
				}
			}
		});

	},

	// Search request validation 
	// @params theSearchReq
	// return string
	validateSearchRequest: function (theSearchReq) {
		if (!theSearchReq.origin.length)
			return config.msg.NO_ORIGIN_SELECTED;
		else if (!theSearchReq.dest.length)
			return config.msg.NO_DESTINATION_SELECTED;
		else if (!theSearchReq.depatureDate.length)
			return config.msg.NO_DEPT_DATE;	
		else if (!this.isValidCity(theSearchReq.origin))
			return config.msg.INVALID_ORIGIN;
		else if (!this.isValidCity(theSearchReq.dest))
			return config.msg.INVALID_DESTINATION;
		else if (theSearchReq.origin === theSearchReq.dest)
			return config.msg.SAME_CITY;
		else if (theSearchReq.type === "return") {
			if (!theSearchReq.returnDate.length)
				return config.msg.NO_RETURN_DATE;
			else
				return true;
		}
		else
			return true;
	},

	// check the validity of the city entered
	// @params theCity
	// @return bool
	isValidCity: function (theCity) {
		if (config.airportList.indexOf(theCity) !== -1)
			return true;
		else
			return false;
	},

	searchForFlightAvailability: function (theType, theSearchReq) {
		var stats = {};
		var result = [];

		if (theType === 'default') {
			result = config.flightList.slice (0);
			return result;
		} else {
			for (var i=0; i<config.flightList.length; i++) {
				var flight = config.flightList[i];

				
					if (flight.depatureDate === theSearchReq.depatureDate) {
						if (flight.origin === theSearchReq.originCode) {
							if (flight.dest === theSearchReq.destCode) {
								if (theSearchReq.type === 'one' && flight.type === 'one') {
									result.push (flight);
								} else {
									if (theSearchReq.type === 'return' && typeof flight.returnFlight !== "undefined") { // ensure return flight avail
										if (flight.returnFlight.returnDate === theSearchReq.returnDate) {
											result.push (flight);
										} else {
											// No flights flights available
											stats = {status: 'error', msg: config.msg.NO_RETURN_ON_DATE};
										}
									}
								}
							} else {
								// No destination flight available
								stats = {status: 'error', msg: config.msg.NO_DESTINATION_AVAIL};
							}
						} else {
							// No origin flight available
							stats = {status: 'error', msg: config.msg.NO_ORIGIN_AVAIL};
						}
					} else {
						// No flights flights available
						stats = {status: 'error', msg: config.msg.NO_FLIGHT_ON_DATE};
					} 
				
			}
			stats = {status: 'success', data: result};
			return stats;
		}
	},


	searchOneWayFlight: function () {},

	searchWithReturnFlight: function () {},

	// Get max and min price based on search results in GUI
	// @return object
	getMinMaxPrice: function () {

		var cloneData = config.flightList.slice(0);

		if (cloneData && cloneData.length) {
			cloneData.sort(function (a, b) {		
			    return a.fare - b.fare;
			});

		return {
			max: cloneData[cloneData.length - 1].fare, 
			min: cloneData[0].fare
		};

		} else {
			return {};
		}
	},

	// Set the max and min price based on search results in GUI
	setMinMaxPrice: function () {
		var price = this.getMinMaxPrice ();
	  	$('#price-range')
		  	.slider('setAttribute', 'min', price.min)
		    .slider('setAttribute', 'max', price.max)
		    .slider('setAttribute', 'value', [price.min, price.max])
		    .slider('refresh');

		$('#min-price').text(price.min);
		$('#max-price').text(price.max);
	},

	// Filter search results using the price range
	// @params thePriceRange
	// @return array
	filterByPrice: function (thePriceRange) {
		var result = [];
		for (var i=0; i<this.searchResults.length; i++) {
			if (this.searchResults[i].fare >= thePriceRange.min && this.searchResults[i].fare <= thePriceRange.max) {
				result.push (this.searchResults[i]);
			}
		}
		return result;
	},

	// Render the search request as header in GUI
	// @params theSearchReq
	renderSearchHeader: function (theSearchReq) {	
		var abbrText = '<strong>' + theSearchReq.origin.split(',')[0] + '</strong>'
						+ '<span id="swap-city">  ->  </span>'
						+ '<strong>' + theSearchReq.dest.split(',')[0] + '</strong>';

		if (theSearchReq.type === 'return')
			abbrText += '<span id="swap-city">  ->  </span>'
						+ '<strong>' + theSearchReq.origin.split(',')[0] + '</strong>';


		$('#flight-abbr').html(abbrText);
		
		var dateText = '<div>Depart Date: <span id="dept-date">' + theSearchReq.depatureDate + '</span></div>';

		if (theSearchReq.type === 'return')
        	dateText += '<div>Return Date: <span id="return-date">' + theSearchReq.returnDate + '</span></div>';

        $('#flight-dates').html(dateText);

	},

	// Render the search results in GUI
	// @params theSearchResults
	// @params theErrMsg
	renderSearchResults: function (theSearchResult, theErrMsg) {
		$('#search-results').empty();
		$("#price-range").slider ('enable');

		if (!theSearchResult.length) {
			var msg = theErrMsg ? theErrMsg : config.msg.NO_FLIGHT_AVAIL;
			var card = '<div class="row flight-card">' + msg + '</div>';
			$('#search-results').append(card);
			$("#price-range").slider ('disable');
			return;
		}

		for (var i=0; i<theSearchResult.length; i++) {

			var res = theSearchResult[i];

			if (res.type === 'one') {
				var card = '<div class="row flight-card">' 						
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2"><span>'+ res.code + '</span><span>' + res.origin + ' -> ' + res.dest + '</span></div>'
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2"><span>Depature</span><span>' + utils.getTime(res.depatureTime) + '</span></div>'
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2"><span>Arrival</span><span>' + utils.getTime(res.arrivalTime) + '</span></div>'
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2"><span>Duration</span><span>' + utils.getDuration(res.depatureTime, res.arrivalTime) + '</span></div>'
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2"><h4 class="price">' + res.fare.toLocaleString() + '</h4></div>'
			            + '<div class="col-sm-2 col-xs-4 col-lg-2 col-md-2">'
			            + '<button type="button" data-flight-id="' + res.id + '" class="btn btn-default book-flight">Book</button>'
			            + '</div>'            
			          	+ '</div>';	
			} else {
				var card = '<div class="row flight-card">'
							+ '<div class="ribbon"><span>Return</span></div>'
							+ '<div style="width: 75%; float: left">'
							+ '<div class="row">'
							+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>'+ res.code + '</span><span>' + res.origin + ' -> ' + res.dest + '</span></div>'
				            + '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Depature</span><span>' + utils.getTime(res.depatureTime) + '</span></div>'
				            + '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Arrival</span><span>' + utils.getTime(res.arrivalTime) + '</span></div>'
				            + '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Duration</span><span>' + utils.getDuration(res.depatureTime, res.arrivalTime) + '</span></div>'				            
							+ '</div>'

							+ '<div class="row" style="border-top: 1px solid #ccc">'
							+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>'+ res.returnFlight.code + '</span><span>' + res.dest + ' -> ' + res.origin + '</span></div>'
							+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Depature</span><span>' + utils.getTime(res.returnFlight.depatureTime) + '</span></div>'
				            + '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Arrival</span><span>' + utils.getTime(res.returnFlight.arrivalTime) + '</span></div>'
				            + '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Duration</span><span>' + utils.getDuration(res.returnFlight.depatureTime, res.returnFlight.arrivalTime) + '</span></div>'				            
							+ '</div>'
							+ '</div>'

							+ '<div style="width: 25%; float: left">'
							+ '<div class="row">'
							+ '<div class="col"><h4 class="price">' + res.fare.toLocaleString() + '</h4></div>'
							+ '</div>'
							+ '<div class="row"><div class="col"><button type="button" data-flight-id="' + res.id + '" class="btn btn-default book-flight">Book</button></div></div>'
							+ '</div>'

							+ '</div>';
			}

			$('#search-results').append(card);	
		}
	},


	// Render flight details in modal window
	// @params theFlightJSON
	renderBookingModal: function (theFlightJSON) {
		
		var title = theFlightJSON.origin + ' -> ' + theFlightJSON.dest;
		var body = '<div>Depart Date: <span id="dept-date">' + theFlightJSON.depatureDate + '</span></div><br>'
					+ '<div class="row">'
					+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Flight: '+ theFlightJSON.code + '</span></div>'
					+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Depature: </span><span>' + utils.getTime(theFlightJSON.depatureTime) + '</span></div>'
			   		+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Arrival: </span><span>' + utils.getTime(theFlightJSON.arrivalTime) + '</span></div>'
			   		+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Duration: </span><span>' + utils.getDuration(theFlightJSON.depatureTime, theFlightJSON.arrivalTime) + '</span></div>'
					+ '</div>';

		if (theFlightJSON.type === 'return') {
			var title = theFlightJSON.origin + ' -> ' + theFlightJSON.dest + ' -> ' + theFlightJSON.origin ;
        	body += '<hr><div>Return Date: <span id="return-date">' + theFlightJSON.returnFlight.returnDate + '</span></div><br>'
						+ '<div class="row">'
						+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Flight: '+ theFlightJSON.returnFlight.code + '</span></div>'
						+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Depature: </span><span>' + utils.getTime(theFlightJSON.returnFlight.depatureTime) + '</span></div>'
				   		+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Arrival: </span><span>' + utils.getTime(theFlightJSON.returnFlight.arrivalTime) + '</span></div>'
				   		+ '<div class="col-sm-3 col-xs-6 col-lg-3 col-md-3"><span>Duration: </span><span>' + utils.getDuration(theFlightJSON.returnFlight.depatureTime, theFlightJSON.returnFlight.arrivalTime) + '</span></div>'
						+ '</div>';
		}

		$('#booking-modal .booking-type').html (theFlightJSON.type);
		$('#booking-modal .price').text (theFlightJSON.fare.toLocaleString());
		$('#booking-modal .modal-title').text (title);		
		$('#booking-modal .booking-body').html (body);
		$('#booking-modal').modal ('show');
	}
};

// Initialize
flightSearchApp.init ();


