const iTunes = Application('iTunes');
const BPM_RANGE = 5;

// Find the first folder with name, if it doesn't exist, create it
function createFolderIfNotExists(name, parent) {
	const folders = iTunes.playlists.whose({ name: name });
	if (folders.length) {
		return folders[0];
	}
	const folder = iTunes.FolderPlaylist().make();
	folder.name = name;
	if (parent) {
		folder.move({ to: parent });
	}
	
	return folder;
};

// Find the first playlist with name, if it doesn't exist, create it
function createPlaylistIfNotExists(name, parent) {
	const playlists = iTunes.playlists.whose({ name: name });
	if (playlists.length) {
		return playlists[0];
	}
	const playlist = iTunes.UserPlaylist().make();
	playlist.name = name;
	if (parent) {
		playlist.move({ to: parent });
	}
	return playlist;
};

function runner() {
	const newFolder = createFolderIfNotExists('SmartSort');
	const timestamp = new Date().getTime();

	// addedDate
	const bucketFolder = createFolderIfNotExists('BPM', newFolder);
	const bucketSubFolders = {};
	
	// Iterate over all tracks, get their bpm and create a label
	// Check if the label already exists, if so, use that playlist, otherwise
	// create a new playlist. Add the track to the playlist.
	iTunes.sources[0].tracks().forEach(track => {
		const bpm = track.bpm();
		const bucket = ((parseInt(bpm / BPM_RANGE, 10)) * BPM_RANGE);
		const label = bucket > 0 ? `T${bucket}-${bucket + (BPM_RANGE-1)}` : 'T-0-UNKNOWN';
		let playlist = bucketSubFolders[label];
		if (!playlist) {
			playlist = createPlaylistIfNotExists(label, bucketFolder);
			bucketSubFolders[label] = playlist;
		}
		try {
			track.duplicate({ to: playlist });
		} catch(e) {
			console.log(`Track ${track.name()} could not be added`);
		}
	});
}

runner();
