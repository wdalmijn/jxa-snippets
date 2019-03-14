JsOsaDAS1.001.00bplist00�Vscript_.// Clear Comments from current playlist
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

init();                              Djscr  ��ޭ