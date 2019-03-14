// Clear Comments from current selection
function clearCommentsForTracks(tracks) {
	tracks.forEach(track => {
		track.comment = '';
	});
}

function init() {
	const iTunes = Application('iTunes');

	const currentTracks = iTunes.selection();
	clearCommentsForTracks(currentTracks);
}

init();