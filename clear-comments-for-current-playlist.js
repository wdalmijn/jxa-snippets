// Clear Comments from current playlist
function clearCommentsForTracks(tracks) {
	tracks.forEach(track => {
		track.comment = '';
	});
}

function init() {
	const iTunes = Application('iTunes');

	const currentTracks = iTunes.currentPlaylist.tracks();
	clearCommentsForTracks(currentTracks);
}

init();