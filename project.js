// Global Variables
var worldData, geoJsonSvg, geoJsonWidth, geoJsonHeight;
var radarSvg, radarWidth, radarHeight;
let zoom;
let selectedCountry = "Albania";

document.addEventListener('DOMContentLoaded', () => {
	geoJsonSvg = d3.select('#worldMap');
	geoJsonWidth = geoJsonSvg.node().clientWidth;
	geoJsonHeight = geoJsonSvg.node().clientHeight;

	radarSvg = d3.select('#radar');
	radarWidth = radarSvg.node().clientWidth;
	radarHeight = radarSvg.node().clientHeight;

	zoom = d3.zoom()                  // create a Zoom function
		.scaleExtent([1,64])
		.on('zoom',zoomed);
	
	geoJsonSvg.call(zoom);                  // attach to the svg

	// Load the data
	Promise.all([d3.json('data/world.geojson'),
				 d3.csv('data/state_fragility.csv')])
	.then(data => {


		worldData = data[0];
		fragilityData = data[1];

		worldData.features.forEach(feature => {
			feature.center = getFeatureCenter(feature)
		});

		// console.log(worldData.features)
		console.log(fragilityData[1])
		updateMap();
		updateRadar();
	});
});

// given a feature, this method will return the center of it
// if the feature has a type of 'MultiPolygon'
// this method will get the center of the polygon with the most edges
// in most cases this will be the largest one
function getFeatureCenter(feature) {
	let polygons = feature.geometry.coordinates;
	var coordinates = [];

	if (feature.geometry.type == 'MultiPolygon') {
		polygons.forEach(p => {
			// console.log(p.length, coordinates.length)
			if (p[0].length > coordinates.length)
				coordinates = p[0];
		});
	} else if (feature.geometry.type == 'Polygon') {
		coordinates = polygons[0];
	}
	var dim = {max_x: -5000, min_x: 5000, max_y: -5000, min_y: 5000};

	coordinates.forEach(c => {
		if (c[0] < dim.min_x) 
			dim.min_x = c[0]
		if (c[0] > dim.max_x) 
			dim.max_x = c[0]
		if (c[1] < dim.min_y) 
			dim.min_y = c[1]
		if (c[1] > dim.max_y) 
			dim.max_y = c[1]
	})

	return [dim.min_x + ((dim.max_x - dim.min_x) / 2),
			dim.min_y + ((dim.max_y - dim.min_y) / 2)]

}

function updateMap() {
	// Get the current projection based on #map-projection-select
	
	const projection = d3.geoMercator();

	// Responsive design based on the width and height of the svg
	projection
		.fitSize([geoJsonWidth-50,geoJsonHeight-50], worldData)
		.translate([geoJsonWidth/2, geoJsonHeight/2]);
	
	// this is similar to a d3.line() generator, except now we are drawing
	// the outline of each geojson shape according to the given map projection
	const geoPath = d3.geoPath().projection(projection);

	let selectYear = d3.select('#year-input').property('value');

	let yearFragilityData = fragilityData.filter( d => +d.Year == +selectYear);
	console.log(yearFragilityData)

	geoJsonSvg.selectAll('.country')
				.data(worldData.features)
				.join(
					enter => {
						enter.append('path')
							.classed('country',true)
							.attr('vector-effect','non-scaling-stroke')
							.attr('id', d => d.properties.name) 
							.attr('d', geoPath)
							.style('fill', d => {
								let name = d.properties.name;
								country_data = yearFragilityData.find (d => 
									{ 
										return d.Country == name;
									});

								// if any country is found with a correlating name 
								// in both data sets, the country will have some
								// sort of filled color
								if (country_data){
									return 'honeydew'
								}

								// if a country isn't found the code below will run
								// console.log(name)
								return 'gray'
							})
							.on('click', function(d,i) {
								selectedCountry = d.properties.name;
								updateRadar();
								drawScatterPlot(selectedCountry);
							});
					},
					update => {
						update.call(update => update.transition()
													.duration(500)
													.style('fill', d => {
														let name = d.properties.name;
														country_data = yearFragilityData.find (d => 
															{ 
																return d.Country == name;
															});
						
														if (country_data){
															return 'honeydew'
														}
						
														// console.log(name)
														return 'gray'
													})
													.attr('d', geoPath));
					}
				);
	
	

	const categoricalScale = d3.scaleOrdinal()
		.domain(["Effectiveness_Score", "Legitimacy_Score", "zero_Score"])
		.range(['red', 'blue', 'green'])

	geoJsonSvg.selectAll('.center')
		.data(worldData.features)
		.join(
			enter => {

				var center_g = enter.append('g')
				.classed('center', true)
				.attr('id', d => d.properties.name)
				.attr('transform', d => `translate(
					${ +projection([+d.center[0], +d.center[1]])[0] }, 
					${ +projection([+d.center[0], +d.center[1]])[1] })`)
					.on('click', function(d,i) {
						console.log(d)
					});

				let pie = d3.pie()
					.value(d => d.value);
				
				let pieArc = d3.arc()
					.innerRadius(.1) 
					.outerRadius(1)

				center_g.selectAll('.donut-arc')
				// center_g.filter(d => {
				// 	let country = yearFragilityData.find( e => e.Country == d.properties.name);
				// 	console.log(country != undefined, country)
				// 	return false;
				// })
				.data(d => {
						let country = yearFragilityData.find( e => e.Country == d.properties.name);

						// console.log(d, country)
						if (country == undefined ) {
							return pie( d3.entries({}))
						} else if (country["Metrics.State Fragility Index"] == 0) {
							return pie( d3.entries({zero_Score: 1}))
						}
						return pie( d3.entries(
						{
							Effectiveness_Score: country["Metrics.Effectiveness.Effectiveness Score"],
							Legitimacy_Score: country["Metrics.Legitimacy.Legitimacy Score"],
					 	}))
						// return pie( d3.entries({a: 9, b:2, c:3} ));
					})
					.join('path')
					.attr('d', pieArc)
					.style('fill', d => categoricalScale(d.data.key))
					.style('stroke', 'black')
					.style('stroke-width', .1)
					.on('click', function(d,i) {
						console.log(d)
					});
				
			}
		);

	// Add graticules
	let graticule = d3.geoGraticule();
	geoJsonSvg.selectAll('.graticule')
				.data(graticule.lines())
				.join(
					enter => {
						enter.append('path')
							 .classed('graticule', true)
							 .attr('vector-effect','non-scaling-stroke') 
							 .attr('d', geoPath);
					},
					update => {
						update.call(update => update.transition()
													.duration(500)
													.attr('d', geoPath));
					}
				);
	
		
	// geoJsonSvg.selectAll('.boundary').remove();
	// geoJsonSvg.append('path')
	// 		.datum(graticule.outline)
	// 		.attr("class", "boundary")
	// 		.attr('vector-effect','non-scaling-stroke') 
	// 		.style('opacity',0)
	// 		.attr('d',geoPath)
	// 		.transition()
	// 		.delay(500)
	// 		.style('opacity',1);

	
}

// no clue if we need to implementing this
// leftover from the map demo
function getProjection() {
	let selectVal = d3.select('#map-projection-select').property('value');
	if(selectVal == 'geoMercator')
		return d3.geoMercator();
	else if(selectVal == 'geoAiry')
		return d3.geoAiry();
	else if(selectVal == 'geoAitoff')
		return d3.geoAitoff();
	else if(selectVal == 'geoAugust')
		return d3.geoAugust();
	else if(selectVal == 'geoAzimuthalEqualArea')
		return d3.geoAzimuthalEqualArea();
	else if(selectVal == 'geoWinkel3')
		return d3.geoWinkel3();
	else 
		// throw statements can be used to generate an error 
		// https://www.w3schools.com/jsref/jsref_throw.asp
		throw `Error: You selected an option that is not handled: ${selectVal}`;
}



// This function is called when a zoom or pan is detected
function zoomed() {      
	// Get the current projection based on #map-projection-select
	const projection = d3.geoMercator();

	// Responsive design based on the width and height of the svg
	projection
		.fitSize([geoJsonWidth-50,geoJsonHeight-50], worldData)
		.translate([geoJsonWidth/2, geoJsonHeight/2]);


	geoJsonSvg.selectAll('.country')
			.attr('transform', d3.event.transform);
	geoJsonSvg.selectAll('.graticule')
			.attr('transform', d3.event.transform);
	// geoJsonSvg.selectAll('.center')
	// 		.attr('transform', d3.event.transform);
	geoJsonSvg.selectAll('.center')
			.attr('transform', d => {
				return `translate(
					${ d3.event.transform.x + projection([+d.center[0], +d.center[1]])[0] * d3.event.transform.k}, 
					${ d3.event.transform.y + projection([+d.center[0], +d.center[1]])[1] * d3.event.transform.k})
					scale( ${d3.event.transform.k}, ${d3.event.transform.k})`;
			});
}

function updateRadar() {
	let countryData = fragilityData.filter( d => d.Country == selectedCountry );
	let selectYear = d3.select('#year-input').property('value');
	
	//will have 2 shapes, one will be the year of maximum stability and other year of minimum stability.
	//if multiple years have the maximum/minimum value for state fragility, will take the oldest one
	let maxYear = countryData.filter(d => +d['Metrics.State Fragility Index'] == d3.max(countryData, f => +f['Metrics.State Fragility Index']))[0];
	let minYear = countryData.filter(d => +d['Metrics.State Fragility Index'] == d3.min(countryData, f => +f['Metrics.State Fragility Index']))[0];
	
	var data = [minYear, maxYear];
	data.forEach(function(f) {
		delete f.Year;
		delete f.Country;
		delete f['Metrics.State Fragility Index'];
		delete f["Metrics.Effectiveness.Effectiveness Score"];
		delete f["Metrics.Legitimacy.Legitimacy Score"];
		f["Metrics.Effectiveness.Economic Effectiveness"] = +f["Metrics.Effectiveness.Economic Effectiveness"];
		f["Metrics.Effectiveness.Political Effectiveness"] = +f["Metrics.Effectiveness.Political Effectiveness"];
		f["Metrics.Effectiveness.Security Effectiveness"] = +f["Metrics.Effectiveness.Security Effectiveness"];
		f["Metrics.Effectiveness.Social Effectiveness"] = +f["Metrics.Effectiveness.Social Effectiveness"];
		f["Metrics.Legitimacy.Economic Legitimacy"] = +f["Metrics.Legitimacy.Economic Legitimacy"];
		f["Metrics.Legitimacy.Political Legitimacy"] = +f["Metrics.Legitimacy.Political Legitimacy"];
		f["Metrics.Legitimacy.Security Legitimacy"] = +f["Metrics.Legitimacy.Security Legitimacy"];
		f["Metrics.Legitimacy.Social Legitimacy"] = +f["Metrics.Legitimacy.Social Legitimacy"];
	});
	console.log(data);

	var cfg = {
		w: 400,				//Width of the circle
		h: 400,				//Height of the circle
		margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
		levels: 4,				//How many levels or inner circles should there be drawn
		maxValue: 3, 			//What is the value that the biggest circle will represent
		labelFactor: 1.25, 	//How much farther than the radius of the outer circle should the labels be placed
		wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
		opacityArea: 0.35, 	//The opacity of the area of the blob
		dotRadius: 4, 			//The size of the colored circles of each blog
		opacityCircles: 0.1, 	//The opacity of the circles of each blob
		strokeWidth: 2, 		//The width of the stroke around each blob
		roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
		color: d3.scaleOrdinal(d3.schemeCategory10)	//Color function
	};

	var maxValue = Math.max(cfg.maxValue, d3.max(data, function(i){console.log(Object.values(i));return d3.max(Object.values(i))}));
	var allAxis = ["Economic Effectiveness", "Political Effectiveness", "Security Effectiveness", "Social Effectiveness", "Economic Legitimacy", "Political Legitimacy", "Security Legitimacy", "Social Legitimacy"],	//Names of each axis
	total = 8,					//The number of different axes
	radius = Math.min(cfg.w/2, cfg.h/2), 	//Radius of the outermost circle
	angleSlice = Math.PI * 2 / total,		//The width in radians of each "slice"
	actualAxis = Object.keys(data[0]);		//The actual CSV names for the selected axis

	//Scale for the radius
	var rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([-1, maxValue]);

	//clear the existing svg
	radarSvg.selectAll('g').remove();
	var g = radarSvg.append("g")
		.attr("transform", "translate(" + (300 + cfg.margin.left) + "," + (300 + cfg.margin.top) + ")");

	//Filter for the outside glow
	var filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", function(d, i){return radius/cfg.levels*d;})
		.style("fill", "#CDCDCD")
		.style("stroke", "#CDCDCD")
		.style("fill-opacity", cfg.opacityCircles)
		.style("filter" , "url(#glow)");

	//Text indicating at what value each level is (lower is better)
	axisGrid.selectAll(".axisLabel")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter().append("text")
	   .attr("class", "axisLabel")
	   .attr("x", 4)
	   .attr("y", function(d){return -d*radius/cfg.levels;})
	   .attr("dy", "0.4em")
	   .style("font-size", "10px")
	   .attr("fill", "#737373")
	   .text(function(d,i) { return 4-d; });

	var axis = axisGrid.selectAll(".axis")
		.data(allAxis)
		.enter()
		.append("g")
		.attr("class", "axis");

	//Append the lines
	axis.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", function(d, i){ return rScale(maxValue*1.1) * Math.cos(angleSlice*i - Math.PI/2); })
		.attr("y2", function(d, i){ return rScale(maxValue*1.1) * Math.sin(angleSlice*i - Math.PI/2); })
		.attr("class", "line")
		.style("stroke", "white")
		.style("stroke-width", "2px");

	//Append the labels at each axis
	axis.append("text")
		.attr("class", "legend")
		.style("font-size", "11px")
		.attr("text-anchor", "middle")
		.attr("dy", "0.35em")
		.attr("x", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
		.attr("y", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
		.text(function(d){return d})
		.call(wrap, cfg.wrapWidth);


	//The radial line function
	var radarLine = d3.lineRadial()
		.curve(d3.curveLinearClosed)
		.radius(function(d) { return rScale(3-d); })
		.angle(function(d,i) {	return i*angleSlice; });
				
	//Create a wrapper for the blobs	
	var blobWrapper = g.selectAll(".radarWrapper")
		.data(data)
		.enter().append("g")
		.attr("class", "radarWrapper");
			
	//Append the backgrounds	
	blobWrapper
		.append("path")
		.attr("class", "radarArea")
		.attr("d", function(d,i) { console.log(radarLine(Object.values(d)));return radarLine(Object.values(d)); })
		.style("fill", function(d,i) { return cfg.color(i); })
		.style("fill-opacity", cfg.opacityArea)
		.on('mouseover', function (d,i){
			//Dim all blobs
			d3.selectAll(".radarArea")
				.transition().duration(200)
				.style("fill-opacity", 0.1); 
			//Bring back the hovered over blob
			d3.select(this)
				.transition().duration(200)
				.style("fill-opacity", 0.7);	
		})
		.on('mouseout', function(){
			//Bring back all blobs
			d3.selectAll(".radarArea")
				.transition().duration(200)
				.style("fill-opacity", cfg.opacityArea);
		});
		
	//Create the outlines	
	blobWrapper.append("path")
		.attr("class", "radarStroke")
		.attr("d", function(d,i) { return radarLine(Object.values(d)); })
		.style("stroke-width", cfg.strokeWidth + "px")
		.style("stroke", function(d,i) { return cfg.color(i); })
		.style("fill", "none")
		.style("filter" , "url(#glow)");		
	
	//Append the circles
	blobWrapper.selectAll(".radarCircle")
		.data(function(d,i) { return d; })
		.enter().append("circle")
		.attr("class", "radarCircle")
		.attr("r", cfg.dotRadius)
		.attr("cx", function(d,i){ return rScale(Object.values(d)) * Math.cos(angleSlice*i - Math.PI/2); })
		.attr("cy", function(d,i){ return rScale(Object.values(d)) * Math.sin(angleSlice*i - Math.PI/2); })
		.style("fill", function(d,i,j) { return cfg.color(j); })
		.style("fill-opacity", 0.8);

}

//Taken from http://bl.ocks.org/mbostock/7555321
//Wraps SVG text	
function wrap(text, width) {
	text.each(function() {
		var text = d3.select(this),
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			lineNumber = 0,
			lineHeight = 1.4, // ems
			y = text.attr("y"),
			x = text.attr("x"),
			dy = parseFloat(text.attr("dy")),
			tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
			
		while (word = words.pop()) {
		line.push(word);
		tspan.text(line.join(" "));
		if (tspan.node().getComputedTextLength() > width) {
			line.pop();
			tspan.text(line.join(" "));
			line = [word];
			tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
		}
		}
	});
}//wrap	