// Dashboard UI

// Signal Hook
var DashboardUI = {
	start : new signals.Signal() 
};

// Add Listener
DashboardUI.start.add(onStart);

// (Re)Start Dashboard UI
function onStart() {
	fetchDonorData();
	$('.create-endowment-btn').on('click', function(e) {
		e.preventDefault();
		hasher.setHash('/');
		EndowmentsUI.newModal.dispatch();
	});

	// Find Endowments Button
	$('.find-endowment-btn').off('click');
	$('.find-endowment-btn').on('click', function(e) {
		// Set Hasher
		hasher.setHash('/');
		e.preventDefault();
	});
}


function fetchDonorData() {
	// First ajax call
	$.ajax({
		url: GLOBAL.SERVER_URL + '/api/donors/balance_information.json',
		type: 'GET',
		contentType: 'application/json',
		dataType: 'json'
	}).done(function(data) {
		balanceGraph(data, $('#balanceFuture'), 'My Projected Impact',
			'donor_projected_balance', 'balance');
		balanceGraph(data, $('#balanceHistory'), 'My Balance History',
			'donor_balance_history', 'balance');

		var totalBalance = data.donor_current_balance;
		var supported_charities = [];

		$.ajax({
			url: GLOBAL.SERVER_URL + '/api/endowment/my_endowments.json', 
			type: 'GET',
			contentType: 'application/json',
			data: {
				group: true
			},
			dataType: 'json'
		})
		.done(function(data) {

			endowmentsPie(data, $('#currentEndowments'), 'Endowments',
				function(ed, subs){
					log(subs);
					for (var i = 0; i < subs.endowments.length; i++) {
						log(subs.endowments[i]);
						ed[i] = {};
						ed[i].id = subs.endowments[i].slug;
						ed[i].name = subs.endowments[i].name;
						ed[i].y = subs.endowments[i].my_balances.my_endowment_balance;
						$.each(subs.endowments[i].charities, function (index, charity) {
							supported_charities.push(charity);
						});
					}
				}, totalBalance);
		})
		.fail(function(data) {
			log(data);
			growlError('An error occured while loading my endowments.');
		});

		// Second ajax call
		$.ajax({
			url: GLOBAL.SERVER_URL + '/api/donors/subscriptions.json', //just to launch, this is terrible
			type: 'GET',
			contentType: 'application/json',
			data: {
				group: true
			},
			dataType: 'json'
		})
		.done(function(data) {

			if (data.Success) {

				$.each(data, function(index, val) {
					// add charity data to google map
					$.each(val.charities, function(index2, val2) {
						supported_charities.push(val2);
					});
					var $row = $("#current-subscriptions-table").find('tbody:last').append('<tr></tr>');
					$row.append("<td align=left><a href=https://www.giv2giv.org/#endowment/"+val.slug+">"+val.name+"</a></td>");
					$row.append("<td align=left>$"+val.my_balances.my_endowment_balance.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')+"</td>");

					if (val.canceled_at) {
						ugly_statement_timestamp = new Date(val.canceled_timestamp * 1000);
						pretty_statement_timestamp = prettify_timestamp(ugly_statement_timestamp);
						$row.append("<td align=left>Canceled "+pretty_statement_timestamp+"</td>");	
					}
					else {
						$row.append("<td align=left>Donating $"+val.my_balances.my_subscription_amount.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')+" per month</td>");	
					}
				});
			}
			else {
				// Clear out previous data
				$("#current-subscriptions-table").find('tbody:last').html("");
				var $row = $("#current-subscriptions-table").find('tbody:last').append('<tr></tr>');
				$row.append("<td align=left>No current subscriptions</td>");
			}
			$("#benefit_charities").html("No charities supported - time to make a donation!");
			if (supported_charities.length > 0) {
				MapsUI.start.dispatch(supported_charities);
				$("#benefit_charities").html(supported_charities.length + " Benefit Charities");
			}
			log('hi2');

		}).fail(function(data) {
			log(data);
			growlError('An error occured while loading the dashboard.');
		});

	}).fail(function(data) {
		log(data);
		growlError('An error occured while loading the dashboard.');
	});
}

// @param subs is an array of endowment objects
function endowmentsPie(subs, DOMnode, titleText, extractData, totalBalance) {
	var endowmentData = [];
	if (subs.length === 0) {
		DOMnode.html(
			'<h3>' + titleText + '</h3>' +
			'<p>You haven\'t subscribed to any endowments yet.</p>' +
			'<p><a href="/" class="btn btn-primary find-endowment-btn">Find an Endowment</a></p>');
	} else {
		extractData(endowmentData, subs);

		DOMnode.highcharts({
			chart: {
				type: 'pie',
				backgroundColor: '#fbfbfb',
			},
			title: { text: titleText },
			subtitle: { text: 'Total Balance: ' + totalBalance.toFixed(2) },
			series: [{
				name: '$',
				data: endowmentData,
				cursor: 'pointer'
			}],
			plotOptions: {
				pie: {
					dataLabels: {
						enabled: false
					},
					showInLegend: true,
					events: {
						click: function(e) {
							hasher.setHash('endowment/' + e.point.id);
						}
					}
				}
			},
			tooltip: {
				formatter: function() {
					return this.point.name + '<br/>$' + this.point.y.toFixed(2);
				}
			},
			credits: { enabled: false }
		});
	}
}
