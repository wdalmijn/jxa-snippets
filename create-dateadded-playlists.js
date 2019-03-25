const iTunes = Application('iTunes');

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
	const addedFolder = createFolderIfNotExists('DateAdded', newFolder);
	const addedSubFolders = {};
	
	// Iterate over all tracks, get their year and month and create a label
	// Check if the label already exists, if so, use that playlist, otherwise
	// create a new playlist. Add the track to the playlist.
	iTunes.sources[0].tracks().forEach(track => {
		const dateAdded = track.dateAdded();
		const year = dateAdded.getFullYear();
		const month = dateAdded.getMonth() + 1;
		const label = `${timestamp}-Y${year}-M${month}`;
		let playlist = addedSubFolders[label];
		if (!playlist) {
			playlist = createPlaylistIfNotExists(label, addedFolder);
			addedSubFolders[label] = playlist;
		}
		try {
			track.duplicate({ to: playlist });
		} catch(e) {
			console.log(`Track ${track.name()} could not be added`);
		}
	});
	
	Object.keys(addedSubFolders).forEach(item => {
		const splitItem = item.split('-');
		const year = splitItem[1];
		const month = splitItem[2];
		const yearFolder = createFolderIfNotExists(year, addedFolder);
		const ref = addedSubFolders[item];
		ref.move({ to: yearFolder });
		ref.name = month;
	});
}

runner();

