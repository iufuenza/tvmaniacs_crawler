var cheerio = require('cheerio');

//This is a module, which make this code behave as an API
//Lo siguiente es un modulo, lo que nos permite tener variables
//locales y que hace que el archivo se comporte como una API


module.exports.getInfo = function(html) {

	var name, user_rating, description, serie, season;
	var $ = cheerio.load(html);

	//NAME
	name = $('span[itemprop="name"]').html();
	if( name )
		name = name.trim();

	user_rating = parseFloat($('span[itemprop="ratingValue"]').html());

	description = $('p[itemprop="description"]').html();
	// try{
	// 	description = formatAllLinks(description);	
	// }
	// catch(err){
	// 	console.log("Ojo!! El capitulo no tenía descripción")
	// }
	if(description != null)
		description = formatAllLinks(description);	
	

	//SERIE
	serie = $(".tv_header a").html();
	if( serie )
		serie = serie.trim();

	// Season
	// var season_episode = $(".tv_header .nobr").html().split(',');
	var season_episode = $(".nobr").html();
	if( season_episode ){
		season_episode = season_episode.split(',');
		season = season_episode[0];
		season = parseInt( season.split(" ")[1] );
	}

	return {
		"series": serie,
		"season": season,
		"name": name,
		"user_rating": user_rating, //(metacritic)
		"description": description
	}
};

module.exports.getLinks = function(html) {
	var $ = cheerio.load(html);
	var pageURL = $('link[rel="canonical"]').attr('href');
	links = [];
	
	var genres = $('.infobar a').filter(':has(span[itemprop="genre"])');
	genres.each(function(index, elem){
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
			"site" : "IMDB",
			"type": "series_list"
		});
	});

	var seasons = $('#titleTVSeries a');
	seasons.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		 links.push({
		 	"url" : url,
		 	"site": "IMDB",
		 	"type": "episodes_list"
		 	});
	});

	var related_series = $('.rec-title').filter(':contains("TV Series")').children('a');
	related_series.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
		 	"site": "IMDB",
		 	"type": "series"
		});
	});

	var actors = $('.cast_list td[itemprop="actor"] a');
	actors.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
		 	"site": "IMDB",
		 	"type": "actor"
		});
	});

	var full_cast = $('#titleCast .see-more a');
	var url = checkURL(pageURL,full_cast.attr('href'));
	links.push({
		"url" : url,
		"site": "IMDB",
		"type": "actors_list"
	});

	var keywords = $('div[itemprop="keywords"] > a');
	keywords.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
		 	"site": "IMDB",
		 	"type": "series_list"
		});
	});

	var country = $('#titleDetails > .txt-block').filter(':contains("Country")').children('a');
	country.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
		 	"site": "IMDB",
		 	"type": "series_list"
		});
	});

	var language = $('#titleDetails > .txt-block').filter(':contains("Language")').children('a');
	language.each(function(index, val) {
		var url = checkURL(pageURL,$(this).attr('href'));
		links.push({
			"url" : url,
		 	"site": "IMDB",
		 	"type": "series_list"
		});
	});
	/*
			{
				"url":"http://...",
				"site": "IMDB"/"Metacritic",
				"type": "actor" / "series" / "episode" / "episodes_list" / "actors_list"
			}
		*/
	return links;
};

var checkURL = function(pageURL,url)
{
	if (url && url.slice(0,1) == '?'){
		return pageURL+url;
	}
	return "www.imdb.com"+url;
	
};

var formatAllLinks = function(text_chain) {
	text_chain_splited = text_chain.split('href="');
	var finalBio = text_chain_splited[0];
	for(var i=1;i<text_chain_splited.length;i++){
		finalBio = finalBio+'href="http://www.imdb.com'+text_chain_splited[i];
	}

	return finalBio;
};