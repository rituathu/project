function drawAxis() {

	d3.select("#scatterPlot").selectAll('g #axis').remove(); 
	g = d3.select('#graph'); 
	
	const yAxis = d3.axisLeft(yScale);
	g.append('g').call(yAxis)
		.attr('id', 'axis')
		.call(g => g.selectAll("text")
			.style("fill", "dark-gray")
			.attr('font-size', '25px')
			);
	
	const xAxis = d3.axisBottom(xScale);
	g.append('g').call(xAxis)
		.attr('id', 'axis')
		.attr('transform',`translate(0,${height})`)
			.call(g => g.selectAll("text")
			.attr('transform','rotate(-18) translate(-15,10)')
			.style("fill", "dark-gray")
			.attr('font-size', '25px')
        );

	g.append('text')
		.attr('id','axis')
		.attr('transform','rotate(-90)')
		.attr('y', -margin.left * .5)
		.attr('x', -height / 2)
		.attr('text-anchor','middle')
		.attr('font-size',  '40px')
		.style("fill", 'black')
		.attr("font-weight", 500)
		.text(yAttribute);

	g.append('text')
		.attr('id','axis')
		.attr('text-anchor','middle')
		.attr('font-size',  '40px')
		.attr('x',width/2)
		.attr('y', height + margin.bottom *.8)
		.style("fill", 'black')
		.attr("font-weight", 500)
		.text(xAttribute);  
}

function redrawPlot() {

	jitter = () => Math.random()*15
	xAttribute = d3.select('#x-attribute-select').property('value');
	yAttribute = d3.select('#y-attribute-select').property('value');
	let year = d3.select('#year-input').property('value');
	state_fragility2 = state_fragility.filter( d => +d.Year == year)
	g = d3.select("#graph")
	g.selectAll('g #data')
        .data(state_fragility2)
        .join(
            enter => {
                g2 = enter.append('g')
					.attr('id', 'data')
					.attr('transform', d => `translate( ${xScale(d[xAttribute])+jitter()} , ${yScale(d[yAttribute])+jitter()})`);
                g2.append('circle').data(data)
					.attr('r', rScale)
					.style("fill", d => {
						color = ""
						countryPicked = "Afghanistan"
						state_fragility2.find( r => {
							if(d.Country == countryPicked){
								color = "red"
							}
							else{
								color = "black"
							}
						})
						return color;
					});
            },
			update => {
				update.call(update => update.transition()
					.attr('transform', d => `translate(${xScale(d[xAttribute])+jitter()} , ${yScale(d[yAttribute])+jitter()})`)
					.select('circle')
					.attr("r", rScale));
			}
        );
}

function drawScatterPlot(selectedCountry) {

	clickedCountry = selectedCountry;
	console.log(clickedCountry);

    xAttribute = d3.select('#x-attribute-select').property('value');
    yAttribute = d3.select('#y-attribute-select').property('value');
    
    var svg = d3.select("#scatterPlot")

    svg.append('g')
        .attr('id', 'graph')
        .attr('transform', 'translate('+ (margin.left) + ', '+ margin.top + ')');
    
	setup();
}