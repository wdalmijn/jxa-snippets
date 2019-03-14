// Clear Comments from Library
function clearCommentsForTracks(tracks) {
	tracks.forEach(track => {
        // Only clear files with comments
		if (!!track.comment()) {
			track.comment = '';
		}
	});
}

function init() {
	const iTunes = Application('iTunes');

	const tracksInLibrary = iTunes.sources[0].tracks();
	clearCommentsForTracks(tracksInLibrary);
}

init();