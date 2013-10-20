var config = require('../config/config.json');
var Crawler = require("crawler").Crawler;
var fs = require('fs');
var sqlite3 = require("sqlite3").verbose();
		
// Info of links in queue
var current_links = {};
var crawler_instance = null;
var enqueued_limit = config["links_enqueued_per_second"];

function wait_new_links(){
    var db = new sqlite3.Database(config["db_file"]);
    db.serialize(function(){
        var check_links_query = "SELECT count(*) as num_links FROM links WHERE date(last_visited,'+" +
            config["revisit_days"] + " days') <= date('now') LIMIT "+enqueued_limit;
        db.each(check_links_query,
            function(err, row) {
                if(row.num_links > 0) {
                    setTimeout(enqueue_links(),1000);
                }
                else {
                    console.log("Waiting "+config["seconds_until_next_db_check"]+" seconds until next check.");
                    setTimeout(wait_new_links,config["seconds_until_next_db_check"]*1000);
                }
            },
            function(err, row) {
                // Close db when no rows left
                db.close();
            }
        );
    });
}


function enqueue_links() {
    create_crowler();
    // Load the database
    var db = new sqlite3.Database(config["db_file"]);
    db.serialize(function() {
        // Get all rows in db
        var active_urls = "SELECT url, site, type, last_visited FROM links WHERE date(last_visited,'+" +
            config["revisit_days"] + " days') <= date('now') LIMIT "+enqueued_limit;
        db.each(active_urls,
            function(err, row) {
                current_links[row.url] = { 'site':row.site, 'type':row.type };
                crawler_instance.queue(row.url);

                // Update last_visited date to revisit_page days later
                var stmt = db.prepare("UPDATE links set last_visited=date('now') WHERE url='"+row.url+"'");
                stmt.run();
                stmt.finalize();
            },
            function(err, row) {
                // Close db when no rows left
                db.close();
            }
        );
    });
}

function create_crowler() {
    crawler_instance = new Crawler({
        "maxConnections": config["max_connections"],
        "callback": function(error,result,$) {
            // This function will be called for each crawled page
            var website_dir = config["html_folder"]+"/"+current_links[result.uri]['site'];
            var dir_name = current_links[result.uri]['type'];
            // Get page source code
            var page = result.body.toString();
            var file_name = "page", file_ext = ".html";

            // Check if name already exists and add to counter
            var page_number = 1;
            while (fs.existsSync(website_dir+"/"+dir_name+"/"+file_name+page_number+file_ext)) {
                page_number++;
            }
            // Write page source code to a file
            var file_path = website_dir+"/"+dir_name+"/"+file_name+page_number+file_ext;
            fs.writeFile(file_path, page, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("File saved: "+file_path);
                }
            });
        },
        "onDrain": function() {
            // This function executes when queue is empty
            console.log("No pages on queue... starting to wait for new active links");
            wait_new_links();
        }
    });
}

wait_new_links();
