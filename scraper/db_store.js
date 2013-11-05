var mongoose = require('mongoose');
var models = require('./models');
var config = require('../config/config.json');

var utils = require('./utils.js');
var fs = require('fs');

var sqlite3 = require("sqlite3").verbose();
var links_db = new sqlite3.Database(config["db_file"]);

// links_db.run("CREATE TABLE links (url TEXT), (site TEXT), (type TEXT), (last_visited datetime)");

mongoose.connect('mongodb://localhost/tvdb');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

module.exports.storeInLocalDB = function(links, local_access) {
    var username = local_access["username"];
    var password = local_access["password"];
    var address = local_access["address"];
    //Solo si no se encuentra el link se agrega. 
    var insert = links_db.prepare( "INSERT INTO links VALUES (?,?,?,?)" );

    var old_date = new Date();
    old_date.setDate( old_date.getDate() - config["revisit_days"] );
    var old_date_str =  old_date.getFullYear() + "-";
    if(old_date.getMonth() + 1 < 10) {
        old_date_str += "0" + (old_date.getMonth() + 1) + "-";
    }
    else {
        old_date_str += (old_date.getMonth() + 1) + "-";
    }

    if(old_date.getDate() < 10) {
        old_date_str += "0" + old_date.getDate();
    }
    else {
        old_date_str += old_date.getDate();
    }

    for( var i = 0; i < links.length; i++){
      var index_ref = (links[i].url.indexOf('&ref') == -1) ? links[i].length : links[i].url.indexOf('&ref');
      index_ref = (links[i].url.indexOf('?ref') == -1) ? index_ref : links[i].url.indexOf('?ref');
      insert.run(
          "http://"+links[i].url.substring(0,index_ref),
          links[i].site.toLowerCase(),
          links[i].type,
          old_date_str
      );
    }

    insert.finalize();

    //Para testear que este guardando.
    // links_db.each("SELECT url, site, type, last_visited as lv FROM links", function(err, row) {
    //     console.log(row.url + ", " + row.site + ", " + row.type + ", " + row.lv);
    // });
};

module.exports.storeInMongo = function(info, mongo_access, model) {
    var username = mongo_access["username"];
    var password = mongo_access["password"];
    var address = mongo_access["address"];

    //En el caso de que sea un episodio lo que se este guardando se debe buscar
    //la serie y la temporada a la que corresponde y embedirlo dentro de ella.

    if ( model == models.chapterModel ){    	
    	utils.print_to_log('Saving episode %s from %s', info.name, info.series );

    	models.serieModel.findOne( { 'name': info.series }, 'name seasons', function( err, series){
    		if (err) return handleError(err);
            if( !series ) {utils.print_to_log('error capitulo sin serie'); return; }

  			var num = info.season - 1;
  			delete info.season;
  			aux = new model ( info );

  			series.seasons[ num ].chapters.push( aux );

  			series.save( function(err){
  				if (err) { utils.print_to_log(err); }
	        	else { utils.print_to_log('exito episode')}
  			});
    	});
    }
    else if( model == models.actorModel){
       models.actorModel.findOneAndUpdate({s_name: info.s_name}, { $set: info}, function(err, actor) {
            if(err)
                return console.error(err);
            else if(actor == null){
                    aux = new model( info );
                    aux.save(function(err){
                        if (err) { utils.print_to_log(err); }
                        else { utils.print_to_log('exito nuevo '+ model.modelName + '  --  ' + info.s_name);}
                    });
            }
            else
                utils.print_to_log('update exitoso ' + actor.s_name);

       });
    }
    else if( model == models.serieModel){
        models.serieModel.findOneAndUpdate({s_name: info.s_name}, { $set: info}, function(err, series) {
            if(err)
                return console.error(err);
            else if(series == null){
                    aux = new model( info );
                    aux.save(function(err){
                        if (err) { utils.print_to_log(err); }
                        else { utils.print_to_log('exito nuevo '+ model.modelName + '  --  ' + info.s_name);}
                    });
            }
            else
                utils.print_to_log('update exitoso ' + series.s_name);

        });
    }
    else {
    	aux = new model( info );
	    aux.save(function(err){
	        if (err) { utils.print_to_log(err); }
	        else { utils.print_to_log('exito '+ model.modelName);}
	   });	
    }
};