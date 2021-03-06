/*
*   A lot of credits go to @northamerican who made most of this script possible!
*   https://github.com/northamerican/get-genres-from-discogs
*   I've merely added some stuff and tweaked it a bit so it hammers the Discogs
*   server a bit less, which was causing the CURL requests to time out at some
*   point and crash the script
*/

var iTunes = Application('iTunes');
var app = Application.currentApplication();

iTunes.includeStandardAdditions = true;
app.includeStandardAdditions = true;

var version = '0.2019.03 beta';
var prefs = {
    // // Option to get all genres and styles
    // multiGenre: true,

    // Separate genres with this character
    genreSeparator: ' / ',

    // Replace a discogs genre string with your own
    replaceGenres: {},

    // Directory to store the log data
    history: '~/Library/Preferences/get-genres-from-discogs.json',

    // Time in seconds to wait between requests to not hammer Discogs too much
    waitTime: '.2',

    // The title of the album on discogs must not be more dissimilar in % to the title in itunes
    matchThreshold: 35 //%
};
var output = {
    // Toggle logging
    logging: true,

    // Directory to store the human-readable log
    directory: 'Desktop',
    filename: 'Get Genres from Discogs.log',
    log: [
        ['Changes'],
        ['No changes made']
    ]
};

var curl = 'curl -L -H "User-Agent: Chrome/40" ';
var searchURL = 'http://www.discogs.com/search/?q=';
var discogsAPIURL = 'https://api.discogs.com';
var songs = iTunes.selection();

var albums = (function() {
    var albums = {};

    Object.keys(songs).forEach(function(el, i){
        var song = songs[i];
        var album = song.album();
        var artist = song.albumArtist() || song.artist();
        var albumArtist = song.albumArtist();
        var historyTitle = artist + ' - ' + album;

        if (!albums[historyTitle]) {
            albums[historyTitle] = {
                title: album,
                artist: artist,
                albumArtist: albumArtist,
                tracks: [
                    song.name(),
                ],
            };
        } else {
            albums[historyTitle].tracks.push(song.name());
        }
    });

    return albums;
})();
var albumTitles = function() {
    var titles = Object.keys(albums);

    Progress.totalUnitCount = titles.length;

    return titles;
};


// Get the master page of an album
var getDiscogsPage = function(album) {
    var artist = albums[album].artist;
    var useMethod = 0;
    var searchMethods = [
        function() { // exact album and artist
            var url = searchURL +
                encodeURIComponent('"' + album + '" ' + artist) // Encode artist and album into URL
                .replace(/%20/g, '+') // Replace spaces with URL encoded +
                .replace(/[\(\)\']/g, '') // Remove characters that break cURL
            return url;
        },
        function() { // album and artist
            var url = searchURL +
                encodeURIComponent(album + ' ' + artist)
                .replace(/%20/g, '+')
                .replace(/[\(\)\']/g, '')
            return url;
        },
        function() { // album
            var url = searchURL +
                encodeURIComponent(album)
                .replace(/%20/g, '+')
                .replace(/[\(\)\']/g, '')
            return url;
        },
        function() { // album and artist brackets removed
            var url = searchURL +
                encodeURIComponent(album + ' ' + artist)
                .replace(/%20/g, '+')
                .replace(/[\(\[][^]+?[\)\]]/, '') // Remove anything in parentheses or brackets
                .replace(/[\(\)\']/g, '')
            return url;
        }
    ];
    var albumURL;

    // Try searching for the album using the methods above
    while (!albumURL && typeof searchMethods[useMethod] === 'function') {
        var page = app.doShellScript(curl + searchMethods[useMethod]() + `; sleep ${prefs.waitTime};`);

        albumURL = page.match(/href="(.*\/(master|release)\/\d+?)"/);
        albumURL = albumURL ? albumURL[1] : null; // First search result
        useMethod++;
    }

    return albumURL;
}

// Get genres/styles for each album
var parseGenres = function() {
    albumTitles().forEach(function(historyTitle, i) {
        var masterPage = getDiscogsPage(historyTitle);
        var albumTitle = albums[historyTitle].title;

        Progress.completedUnitCount = i + 1;
        Progress.description = 'Processing album "' + historyTitle + '"';

        if(!masterPage) {
            albums[historyTitle].discogs = {
                title: false,
                artists: [],
                genres: [],
                match: false
            };

            return;
        }

        // Get the release's info using discog's API
        // master -> masters, release -> releases
        var pageAPI = discogsAPIURL +
        masterPage.match(/\/(release|master)\/.+/)[0]
        .replace('master', 'masters')
        .replace('release', 'releases');

        var discogsJSON = JSON.parse(app.doShellScript(curl + pageAPI + `; sleep ${prefs.waitTime};`));

        // Save info gathered from discogs's API
        albums[historyTitle].discogs = {
            title: discogsJSON.title,
            artists: discogsJSON.artists.map(function(artist) {
                return artist.name;
            }),
            genres: (function() {
                var genres = discogsJSON.styles || [];

                return genres;
            })(),
            match: (function() {
                return diffQuotient(albumTitle, discogsJSON.title) < prefs.matchThreshold;
            })()
        }
    });
}
// Apply genres to iTunes tracks
var applyGenres = function() {
    var history = {};
    var createLog;

    parseGenres();

    // Get existing history
    try {
        history = app.doShellScript('cat ' + prefs.history);
    } catch(e) {
        // throw "couldn't fetch history";
        history = {};
    }

    try {
        history = JSON.parse(history.replace(/`/g, "'"));
    } catch(e) {
        // throw "couldn't parse history";
        history = {};
    }

    // Add albums to history
    Object.keys(albums).forEach(function(historyTitle) {
        var album = albums[historyTitle];
        
        // Add to history object
        history[historyTitle] = album;
    });

    // Save history object
    app.doShellScript("echo '" + JSON.stringify(history, null, 4).replace(/\'/g, "`") + "' > " + prefs.history);


    // Set genres to iTunes tracks
    songs.forEach(function(song) {
        var artist = song.albumArtist() || song.artist();
        var album = albums[artist + ' - ' + song.album()];
        var genres = album.discogs.genres;
        var isMatch = album.discogs.match;

        // User-specified genre replacement
        Object.keys(prefs.replaceGenres).forEach(function(genre) {
            var replacement = prefs.replaceGenres[genre];

            genres[genres.indexOf(genre)] = replacement;
        });

        if(genres.length && isMatch) {
            // Set genre of song
            song.genre = genres.join(prefs.genreSeparator);

            // // Add song to playlist for each genre
            // Still gotta figure out the syntax for this. JXA documentation is unclear...
            // genres.forEach(function(genre) {
            //     iTunes.make({
            //         new: 'playlist',
            //         withProperties: {
            //             name: genre
            //         },
            //         // at: {
            //         //     folderPlaylist: 'history'
            //         // }
            //     });
            // });
        }
    });

    // Log
    Object.keys(history).forEach(function(historyTitle) {
        var album = history[historyTitle];
        var title = album.discogs.title;
        var artists = album.discogs.artists.join(', ');
        var genres = album.discogs.genres.join(prefs.genreSeparator);
        var isMatch = album.discogs.match;

        if(genres.length && isMatch) {
            output.log[0].push(historyTitle + '\n' + 'from: ' + artists + ' - ' + title + '\n' + genres + '\n');
        } else if (genres.length && !isMatch) { //"!isMatch" redundant
            output.log[1].push(historyTitle + '\n' + 'did not match: ' + artists + ' - ' + title + '\n');
        } else {
            output.log[1].push(historyTitle + '\n');
        }
    });

    // Save log
    if(output.logging) {
        output.log = output.log.map(function(log) {
            return log.join('\n');
        });

        createLog = 'echo ' + JSON.stringify(output.log.join('\n\n\n\n')) +
        ' > ~/' + output.directory + '/' + output.filename.replace(/\s/g, '\\ ')

        app.doShellScript(createLog);
    }

    return albums;
}

// Compare the difference of the supplied album title and the title on discogs
// to determine if they are the same album.
function diffQuotient(a, b) {
    //http://jsperf.com/levenshtein-algorithms/16
    var levDist = function(a, b) {
        if (a == b) return 0;
        var aLen = a.length, bLen = b.length;
        if (!aLen) return bLen;
        if (!bLen) return aLen;
        var len = aLen + 1,
            v0 = new Array(len),
            v1 = new Array(len),
            c2, min, tmp,
            i = 0,
            j = 0;
        while(i < len) v0[i] = i++;
        while(j < bLen) {
            v1[0] = j + 1;
            c2 = b.charAt(j++);
            i = 0;
            while(i < aLen) {
                min = v0[i] - (a.charAt(i) == c2 ? 1 : 0);
                if (v1[i] < min) min = v1[i];
                if (v0[++i] < min) min = v0[i];
                v1[i] = min + 1;
            }
            tmp = v0; v0 = v1; v1 = tmp;
        }

        return v0[aLen];
    }
    var len = (a.length + b.length) / 2;
    var dist = levDist(a, b);

    return 100 / (len / dist);
}

applyGenres();

Progress.description = 'Processing albums...';