
document.addEventListener('DOMContentLoaded', () => {
    let songs = [];
    let currentIndex = 0;
    const playlist = [];
    const audio = new Audio();
    

    const title = document.querySelector(".title");
    const playPauseButton = document.getElementById('play-pause');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const songImage = document.getElementById('song-image');
    const songTitle = document.querySelector('.song-title');
    const songArtist = document.querySelector('.song-artist');
    const playFromStartButton = document.querySelector('.play-from-start');
    const progress = document.getElementById('progress');
    const timeCompleted = document.getElementById('timecompleted');
    const timeTotal = document.getElementById('timetotal');
    const songDescription = document.querySelector('.song-description');
    const speedSelect = document.getElementById('speed');
    const forward = document.getElementById('forward');
    const rewind = document.getElementById('rewind');
    const volumeSlider = document.querySelector('.volume-slider'); // Add this line to select the volume slider
    const slider = document.querySelector('.volume-slider');
    const musicplayer = document.getElementsByClassName('musicplayer')[0];
    const mainContainer = document.getElementsByTagName("main")[0];
    const singerBefore = document.getElementById("singer-before");
    const speedBefore = document.getElementById("speed-before");
    const singer = document.getElementsByClassName("singer")[0];
    const speed = document.getElementById("speed");
    const singerSelect = document.getElementById('singer'); // Add this line to select the singer dropdown
    const reqButton = document.getElementsByClassName("req")[0];
    musicplayer.style.animationPlayState = 'paused';
    let currentPlaybackRate = parseFloat(speedSelect.value); // Store the current playback speed
    const playlistButton = document.querySelector(".yourPlaylist");
    

    const genreBefore = document.getElementById("genre-before");
const genre = document.getElementsByClassName("genre")[0];
const genreSelect = document.getElementById('genre');

genreBefore.addEventListener('click', () => {
    genreBefore.classList.add("hidden");
    genre.classList.remove("hidden");
    genre.classList.add("flex");
    updateSongsByGenre('Hindi-New'); // Default value for initialization
});

function updateSongsByGenre(selectedGenre) {
    const genreMap = {
        'Hindi-New': 'Genres/Hindi-New.json',
        'Hindi-Old': 'Genres/Hindi-Old.json',
        'Ghazals': 'Genres/Ghazals.json',
        'Slowed & Reverb': 'Genres/Slowed-Reverb.json',
        'Punjabi': 'Genres/Punjabi.json'
    };

    const jsonFile = genreMap[selectedGenre] || 'Allsongs/songs.json';
    document.querySelector('.without-ads').innerHTML = `${selectedGenre} Songs - No Ads`;

    fetch(jsonFile)
        .then(response => response.json())
        .then(data => {
            songs = data.sort((a, b) => a.title.localeCompare(b.title));
            loadSongList();
        })
        .catch(error => console.error('Error fetching songs:', error));
}


genreSelect.addEventListener('change', () => {
    const selectedGenre = genreSelect.value;
    updateSongsByGenre(selectedGenre);
});


const oldisgoldBefore = document.getElementById("oldisgold-before");
const oldisgold = document.getElementsByClassName("oldisgold")[0];
const oldisgoldSelect = document.getElementById('oldisgold');

oldisgoldBefore.addEventListener('click', () => {
    oldisgoldBefore.classList.add("hidden");
    oldisgold.classList.remove("hidden");
    oldisgold.classList.add("flex");
    updateSongsByOldIsGold('Jagjit Singh'); // Default value for initialization
});
function updateSongsByOldIsGold(selectedSinger) {
    const singerMap = {
        'Jagjit Singh': 'OldIsGold/JagjitSingh.json',
        'Ghulam Ali': 'OldIsGold/GhulamAli.json',
        'Kishore Kumar': 'OldIsGold/KishoreKumar.json',
        'Mohammad Rafi': 'OldIsGold/MohammadRafi.json'
    };

    const jsonFile = singerMap[selectedSinger] || 'Allsongs/songs.json';
    document.querySelector('.without-ads').innerHTML = `${selectedSinger} Songs - No Ads`;

    fetch(jsonFile)
        .then(response => response.json())
        .then(data => {
            songs = data.sort((a, b) => a.title.localeCompare(b.title));
            loadSongList();
        })
        .catch(error => console.error('Error fetching songs:', error));
}


oldisgoldSelect.addEventListener('change', () => {
    const selectedSinger = oldisgoldSelect.value;
    updateSongsByOldIsGold(selectedSinger);
});
function trimAndDecodeURL(url) {
    const baseURL = 'https://itsnjedits.github.io/musicplayer/';
    if (url.startsWith(baseURL)) {
        // Trim the base URL
        let trimmedURL = url.slice(baseURL.length);
        // Decode %20 to spaces
        return decodeURIComponent(trimmedURL);
    } else {
        console.error('URL does not start with the expected base URL.');
        return url;
    }
}

function modifyAndDecodeURL(url) {
    const baseURL = 'https://itsnjedits.github.io/musicplayer/Thumbnails';
    const newBaseURL = 'Audio';
    const oldExtension = '_thumbnail.jpg';
    const newExtension = '.mp3';

    // Check if the URL starts with the base URL
    if (url.startsWith(baseURL)) {
        // Replace the base URL with the new base URL
        let modifiedURL = url.replace(baseURL, newBaseURL);
        
        // Replace '_thumbnail.jpg' with '.mp3'
        if (modifiedURL.endsWith(oldExtension)) {
            modifiedURL = modifiedURL.slice(0, -oldExtension.length) + newExtension;
        }

        // Decode the URL and replace '%20' with spaces
        return decodeURIComponent(modifiedURL);
    } else {
        console.error('URL does not start with the expected base URL.');
        return url;
    }
}
// Function to remove an item from the playlist and update the UI
function removeFromPlaylist(index) {
    // Remove the item from the playlist array
    playlist.splice(index, 1);

    // Update the songs array to reflect changes
    songs = playlist.filter((song, idx, self) => 
        idx === self.findIndex((s) => s.image === song.image)
    );

    // Clear the current playlist display
    const arrayDiv = document.querySelector('.array');
    arrayDiv.innerHTML = '';

    // Re-render the playlist after removal
    songs.forEach((song, newIndex) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item flex justify-between items-center bg-gray-700 rounded-xl p-2 max-md:p-1 mx-4 max-md:mx-2 min-md:hover:bg-gray-600 duration-300 cursor-pointer';
        itemDiv.dataset.index = newIndex;
        itemDiv.innerHTML = 
            `<div class="text-white flex items-center gap-x-4 max-md:gap-x-2">
                <img src="${song.image}" class="max-md:max-md:h-12 max-md:w-20 w-36 h-20 object-cover rounded-lg object-top" alt="${song.title}">
                <div class="text">
                    <h2 class="max-md:text-base song-title font-semibold text-xl max-[500px]:text-[13.5px]">${song.title}</h2>
                    <p class="song-artist max-md:text-sm text-gray-300 max-[500px]:text-[12px]">${song.artist}</p>
                </div>
            </div>
            <div class="song-play flex items-center gap-x-2 mr-3 max-md:mr-2 max-md:gap-x-1">
                <div class="visualizer hidden">
                    <div class="bar max-md:w-[2px] bar1"></div>
                    <div class="bar max-md:w-[2px] bar2"></div>
                    <div class="bar max-md:w-[2px] bar3"></div>
                    <div class="bar max-md:w-[2px] bar4"></div>
                    <div class="bar max-md:w-[2px] bar5"></div>
                </div>
                <p class="text-5xl remove-from-playlist  text-[#2b8bff] cursor-pointer hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-minus'></i></p>
                <p class="text-5xl play-from-start text-[#2b8bff] cursor-pointer min-md:hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-play'></i></p>
            </div>`;
        
        // Remove button ka event listener
        itemDiv.querySelector('.remove-from-playlist').addEventListener('click', (e) => {
            e.stopPropagation(); // Ye ensure karega ki parent click event trigger na ho
            removeFromPlaylist(newIndex);
        });

        // Poore itemDiv pe click karne par song play hoga
        itemDiv.addEventListener('click', () => {
            playSong(newIndex);
        });

        arrayDiv.appendChild(itemDiv);
    });
}

// Event listener for the playlist button
playlistButton.addEventListener('click', () => {
    const arrayDiv = document.querySelector('.array');
    arrayDiv.innerHTML = '';

    // Filter out duplicate songs based on image
    songs = playlist.filter((song, index, self) => 
        index === self.findIndex((s) => s.image === song.image)
    );

    songs.forEach((song, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item flex justify-between items-center bg-gray-700 rounded-xl p-2 max-md:p-1 mx-4 max-md:mx-2 min-md:hover:bg-gray-600 duration-300 cursor-pointer';
        itemDiv.dataset.index = index;
        itemDiv.innerHTML = 
            `<div class="text-white flex items-center gap-x-4 max-md:gap-x-2">
                <img src="${song.image}" class="max-md:max-md:h-12 max-md:w-20 w-36 h-20 object-cover rounded-lg object-top" alt="${song.title}">
                <div class="text">
                    <h2 class="max-md:text-base song-title font-semibold text-xl max-[500px]:text-[13.5px]">${song.title}</h2>
                    <p class="song-artist max-md:text-sm text-gray-300 max-[500px]:text-[12px]">${song.artist}</p>
                </div>
            </div>
            <div class="song-play flex items-center gap-x-2 mr-3 max-md:mr-2 max-md:gap-x-1">
                <div class="visualizer hidden">
                    <div class="bar max-md:w-[2px] bar1"></div>
                    <div class="bar max-md:w-[2px] bar2"></div>
                    <div class="bar max-md:w-[2px] bar3"></div>
                    <div class="bar max-md:w-[2px] bar4"></div>
                    <div class="bar max-md:w-[2px] bar5"></div>
                </div>
                <p class="text-5xl remove-from-playlist text-[#2b8bff] cursor-pointer hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-minus'></i></p>
                <p class="text-5xl play-from-start text-[#2b8bff] cursor-pointer min-md:hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-play'></i></p>
            </div>`;
        
        // Remove button ka event listener
        itemDiv.querySelector('.remove-from-playlist').addEventListener('click', (e) => {
            e.stopPropagation(); // Ye ensure karega ki parent click event trigger na ho
            removeFromPlaylist(index);
        });

        // Poore itemDiv pe click karne par song play hoga
        itemDiv.addEventListener('click', () => {
            playSong(index);
        });

        arrayDiv.appendChild(itemDiv);
    });
});



function loadSongList() {
    const arrayDiv = document.querySelector('.array');
    arrayDiv.innerHTML = '';

    songs.forEach((song, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item flex justify-between items-center bg-gray-700 rounded-xl p-2 max-md:p-1 mx-4 max-md:mx-2 min-md:hover:bg-gray-600 duration-300 cursor-pointer';
        itemDiv.dataset.index = index;
        itemDiv.innerHTML = 
            `<div class="text-white flex items-center gap-x-4 max-md:gap-x-2">
                <img src="${song.image}" class="max-md:max-md:h-12 max-md:w-20 w-36 h-20 object-cover rounded-lg object-top" alt="${song.title}">
                <div class="text">
                    <h2 class="max-md:text-base song-title font-semibold text-xl max-[500px]:text-[13.5px]">${song.title}</h2>
                    <p class="song-artist max-md:text-sm text-gray-300 max-[500px]:text-[12px]">${song.artist}</p>
                </div>
            </div>
            <div class="song-play flex items-center gap-x-2 mr-3 max-md:mr-2 max-md:gap-x-1">
                <div class="visualizer hidden">
                    <div class="bar max-md:w-[2px] bar1"></div>
                    <div class="bar max-md:w-[2px] bar2"></div>
                    <div class="bar max-md:w-[2px] bar3"></div>
                    <div class="bar max-md:w-[2px] bar4"></div>
                    <div class="bar max-md:w-[2px] bar5"></div>
                </div>
                <p class="text-5xl add-to-playlist  text-[#2b8bff] cursor-pointer hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-plus'></i></p>
                <p class="text-5xl play-from-start text-[#2b8bff] cursor-pointer min-md:hover:text-[#29ecfe] max-md:text-2xl "><i class='bx bx-play'></i></p>
            </div>`
        ;

        itemDiv.addEventListener('click', (event) => {
            // Check if the click event was on the 'add-to-playlist' element
            const addToPlaylistButton = event.target.closest('.add-to-playlist');
            if (addToPlaylistButton) {
                event.stopPropagation(); // Ensure the click event does not bubble up to the itemDiv
                
                // Extract data from the DOM
                const imageURL = trimAndDecodeURL(addToPlaylistButton.parentElement.parentElement.children[0].children[0].src);
                const fileURL = modifyAndDecodeURL(addToPlaylistButton.parentElement.parentElement.children[0].children[0].src);
                const title = addToPlaylistButton.parentElement.parentElement.children[0].children[1].children[0].textContent;
                const artist = addToPlaylistButton.parentElement.parentElement.children[0].children[1].children[1].textContent;
        
                // Create a JSON object
                const songData = {
                    image: imageURL,
                    file: fileURL,
                    title: title,
                    artist: artist
                };
        
                // Add the JSON object to the array
                playlist.push(songData);
        
                // Log the updated playlist array
                console.log(JSON.stringify(playlist, null, 2));
                return; // Exit the event handler to prevent playSong from being called
            }
            // Play the song if the click was on the itemDiv
            playSong(index);
        });
        
        arrayDiv.appendChild(itemDiv);
    });
}



function fetching(filename){
    fetch(`${filename}`)
            .then(response => response.json())
            .then(data => {
                songs = data.sort((a, b) => a.title.localeCompare(b.title)); // Sort songs alphabetically
                loadSongList();
            })
            .catch(error => console.error('Error fetching songs:', error));
}
    title.addEventListener('click',()=>{
        fetching('Allsongs/songs.json')
            
            document.querySelector('.without-ads').innerHTML = `Non-Stop 350+ Songs - No Ads`
        })
        
    playlistButton.addEventListener('click',()=>{
        document.querySelector('.without-ads').innerHTML = `Apne Gaane`
        
    })

    reqButton.addEventListener('click',()=>{
        fetching('Request/requestedSongs.json');
            document.querySelector('.without-ads').innerHTML = `Your Requests, Our Responsibility - No Ads`
    })



    function disableAllButtons() {
        playPauseButton.disabled = true;
        playPauseButton.classList.remove('hover:min-md:bg-blue-400');
        prevButton.disabled = true;
        prevButton.classList.remove('min-md:hover:bg-gray-500');
        nextButton.disabled = true;
        nextButton.classList.remove('min-md:hover:bg-gray-500');
        forward.disabled = true;
        forward.classList.remove('min-md:hover:bg-gray-500');
        rewind.disabled = true;
        rewind.classList.remove('min-md:hover:bg-gray-500');
    }

    function enableAllButtons() {
        playPauseButton.disabled = false;
        playPauseButton.classList.add('hover:min-md:bg-blue-400');
        prevButton.disabled = false;
        prevButton.classList.add('min-md:hover:bg-gray-500');
        nextButton.disabled = false;
        nextButton.classList.add('min-md:hover:bg-gray-500');
        forward.disabled = false;
        forward.classList.add('min-md:hover:bg-gray-500');
        rewind.disabled = false;
        rewind.classList.add('min-md:hover:bg-gray-500');
    }

    disableAllButtons();        


    singerBefore.addEventListener('click', () => {
        singerBefore.classList.add("hidden");
        singer.classList.remove("hidden");
        singer.classList.add("flex");
        updateSongsBySinger('Arijit Singh');
    });

    speedBefore.addEventListener('click', () => {
        speedBefore.classList.add("hidden");
        speed.classList.remove("hidden");
    });

    //Play From start button jisse songs start se play hote hain

    playFromStartButton.addEventListener('click', () => {
        if (songs.length > 0) {
            playSong(0);
        }
    });

    fetch('Allsongs/songs.json')
            .then(response => response.json())
            .then(data => {
                songs = data.sort((a, b) => a.title.localeCompare(b.title)); // Sort songs alphabetically
                loadSongList();
            })
            .catch(error => console.error('Error fetching songs:', error));
            loadSongList();
function updateSongsBySinger(selectedSinger) {
    const singerMap = {
        'Arijit Singh': 'Singersongs/Arijit Singh.json',
        'Atif Aslam': 'Singersongs/Atif Aslam.json',
        'Mohammad Irfan': 'Singersongs/Mohammad Irfan.json',
        'KK': 'Singersongs/KK.json',
        'Shafaqat Amanat Ali': 'Singersongs/Shafaqat Amanat Ali.json',
        'Mohit Chauhan': 'Singersongs/Mohit Chauhan.json',
        'Jubin Nautiyal': 'Singersongs/Jubin Nautiyal.json',
        'Armaan Malik': 'Singersongs/Armaan Malik.json',
        'Rahat Fateh Ali Khan': 'Singersongs/Rahat Fateh Ali Khan.json',
        'Sonu Nigam': 'Singersongs/Sonu Nigam.json'
    };

    const jsonFile = singerMap[selectedSinger] || 'Allsongs/songs.json';
    document.querySelector('.without-ads').innerHTML = `${selectedSinger} Songs - No Ads`;

    fetch(jsonFile)
        .then(response => response.json())
        .then(data => {
            songs = data.sort((a, b) => a.title.localeCompare(b.title));
            loadSongList();
        })
        .catch(error => console.error('Error fetching songs:', error));
}


            singerSelect.addEventListener('change', () => {
                const selectedSinger = singerSelect.value;
                updateSongsBySinger(selectedSinger);
            });

            
    function playSong(index) {
        mainContainer.classList.remove("mb-28");
        mainContainer.classList.remove("max-md:mb-20");
        if (window.innerWidth < 768) {
            mainContainer.classList.add("mb-32");
            mainContainer.classList.remove("mb-56");
        } else {
            mainContainer.classList.add("mb-56");
            mainContainer.classList.remove("mb-32");
        }
        // updateClassBasedOnWidth();
        if (index < 0 || index >= songs.length) return;
        currentIndex = index;
        const song = songs[currentIndex];
        audio.src = song.file;
        audio.playbackRate = currentPlaybackRate; // Apply the stored playback speed
        audio.play();
        musicplayer.style.animationPlayState = 'running';
        updatePlayer(song);
        enableAllButtons(); // Enable buttons when a song is playing
        Reverb();
    }


    function updatePlayer(song) {
        songImage.src = song.image;
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        songDescription.classList.remove('opacity-0'); // Show the song description
        songDescription.style.display = 'flex'; // Show the music player
        playPauseButton.innerHTML = `<i class='bx bx-pause' ></i>`;
        updateButtons();
        updateTime();
        updateVisualizers(); // Update visualizers
        highlightCurrentSong(); // Highlight the current song
    }

    function updateButtons() {
        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === songs.length - 1;
        prevButton.style.backgroundColor = prevButton.disabled ? '' : 'bg-gray-600';
        nextButton.style.backgroundColor = nextButton.disabled ? '' : 'bg-gray-600';
    }

    function updateTime() {
        const update = () => {
            const currentTime = audio.currentTime;
            const duration = audio.duration;
            const formattedCurrentTime = formatTime(currentTime);
            const formattedDuration = formatTime(duration);
            timeCompleted.textContent = formattedCurrentTime;
            timeTotal.textContent = formattedDuration;
            progress.max = duration;
            progress.value = currentTime;
        };

        const formatTime = (time) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        update();
        audio.addEventListener('timeupdate', update);
    }

    function seek() {
        audio.currentTime = progress.value;
    }

    function changeTime(amount) {
        audio.currentTime = Math.min(Math.max(audio.currentTime + amount, 0), audio.duration);
    }

    function playNextSong() {
        if (currentIndex < songs.length - 1) {
            playSong(currentIndex + 1);
        }
    }

    function playPrevSong() {
        if (currentIndex > 0) {
            playSong(currentIndex - 1);
        }
    }

    function updateVisualizers() {
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            const visualizer = item.querySelector('.visualizer');
            if (parseInt(item.dataset.index) === currentIndex || songDescription.style.display === 'flex' && item.querySelector('.song-title').textContent === songTitle.textContent) {
                visualizer.classList.remove('hidden');

            } else {
                visualizer.classList.add('hidden');
            }
        });
    }

    function highlightCurrentSong() {
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            const songTitleElement = item.querySelector('.song-title');
            item.classList.remove('bg-gray-700','bg-gray-600'); // Add border class

            if (songTitleElement.textContent === songTitle.textContent) {
                item.classList.add('border-[1px]', 'border-[#29ecfe]','bg-gray-600'); // Add border class
            } else {
                item.classList.remove('border-[1px]', 'border-[#29ecfe]'); // Remove border class
            }
        });
    }
    

    playPauseButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            playPauseButton.innerHTML = `<i class='bx bx-pause' ></i>`;
            musicplayer.style.animationPlayState = 'running';
        } else {
            audio.pause();
            playPauseButton.innerHTML = `<i class='bx bx-play'></i>`;
            musicplayer.style.animationPlayState = 'paused';
        }
    });

    prevButton.addEventListener('click', playPrevSong);
    nextButton.addEventListener('click', playNextSong);
    forward.addEventListener('click', () => changeTime(10));
    rewind.addEventListener('click', () => changeTime(-10));
    volumeSlider.addEventListener('input', (e) => audio.volume = e.target.value / 100); // Add volume control
    speedSelect.addEventListener('change', (e) => {
        currentPlaybackRate = parseFloat(e.target.value);
        audio.playbackRate = currentPlaybackRate;
    });
    progress.addEventListener('input', seek);


    // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
  const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  const actions = {
    KeyN: () => nextButton.click(),
    KeyP: () => prevButton.click(),
    KeyM: () => {
      audio.volume = audio.volume ? 0 : 0.6;
      slider.value = audio.volume * 100;
    },
    ArrowRight: () => changeTime(10),
    ArrowLeft: () => changeTime(-10),
    Space: () => playPauseButton.click()
  };

  if (!isInput && actions[event.code]) {
    event.preventDefault();
    actions[event.code]();
  }
});


    // Auto-next feature
    audio.addEventListener('ended', playNextSong);

    // Searching Songs
    const searchInput = document.getElementById('search-input');
    const searchNextBtn = document.getElementById('search-next-btn');
    
    searchInput.addEventListener('input', () => searchWebsite(false));
    searchNextBtn.addEventListener('click', () => searchWebsite(true));
    
    let searchResultIndex = -1;
    
    function searchWebsite(findNext) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      const elements = document.querySelectorAll('.item');
    
      elements.forEach(el => {
        el.children[0].children[1].children[0].style.color = '';
        el.children[0].children[1].children[1].style.color = '';
        el.classList.remove('bg-gray-900');
      });
    
      if (searchTerm) {
        for (let i = findNext ? searchResultIndex + 1 : 0; i < elements.length; i++) {
          if (elements[i].textContent.toLowerCase().includes(searchTerm)) {
            searchResultIndex = i;
            highlightElement(elements[i]);
            break;
          }
        }
      }
    }

    function highlightElement(el) {
      el.children[0].children[1].children[0].style.color = 'yellow';
      el.children[0].children[1].children[1].style.color = 'yellow';
      el.classList.add('bg-gray-900');
    
      const yOffset = el.offsetTop + (el.offsetHeight / 2) - (window.innerHeight / 2);
      window.scrollTo({ top: yOffset, behavior: 'smooth' });
    }

    function Reverb(){
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);

    const convolver = audioContext.createConvolver();
        fetch("rir_jack_lyons_lp3_96k.wav")
            .then(response => response.arrayBuffer())
            .then(data => audioContext.decodeAudioData(data))
            .then(decodedData => convolver.buffer = decodedData)
            .catch(error => console.error('Error loading reverb file:', error));

    // Connect nodes
    source.connect(convolver);
    convolver.connect(audioContext.destination);

    // BiquadFilter for pitch adjustment
    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "allpass"; // All-pass filter

    // Connect pitch control
    source.connect(biquadFilter);
    biquadFilter.connect(audioContext.destination);

    // Slider Controls
    document.getElementById('reverbSlider').addEventListener('input', function() {
        convolver.normalize = this.value > 0.5; // Adjust reverb intensity
    });

    document.getElementById('pitchSlider').addEventListener('input', function() {
        const pitchValue = this.value;
        biquadFilter.frequency.value = pitchValue * 1000; // Adjust frequency for pitch effect
    });
}


    });
