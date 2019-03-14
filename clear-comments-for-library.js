// Clear Comments from Library
function clearCommentsForTracks(tracks) {
	tracks.forEach(track => {
		track.comment = '';
	});
}

function init() {
	const iTunes = Application('iTunes');

	const tracksInLibrary = iTunes.sources[0].tracks();
	clearCommentsForTracks(tracksInLibrary);
}

init();