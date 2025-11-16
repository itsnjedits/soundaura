document.addEventListener('DOMContentLoaded', () => {
    let songs = [];
    let currentIndex = 0;
    const playlist = [];
    const audio = new Audio();
    let isLooping = false;
    const loopButton = document.querySelector('.loop');
    loopButton.addEventListener('click', () => {
        isLooping = !isLooping;
        loopButton.classList.toggle('text-red-500', isLooping);
    });
    const reqSongButton = document.querySelector(".reqSong");

    const title = document.querySelector(".title");
    const playPauseButton = document.getElementById('play-pause');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const songImage = document.getElementById('song-image');
    const songTitle = document.querySelector('.song-title');
    const songArtist = document.querySelector('.song-artist');
    // const playFromStartButton = document.querySelector('.play-from-start');
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
    const singer = document.getElementsByClassName("singer")[0];
    const singerSelect = document.getElementById('singer'); // Add this line to select the singer dropdown
    musicplayer.style.animationPlayState = 'paused';
    let currentPlaybackRate = parseFloat(speedSelect.value); // Store the current playback speed
    const playlistButton = document.querySelector(".yourPlaylist");


    const genreBefore = document.getElementById("genre-before");
    const genre = document.getElementsByClassName("genre")[0];
    const genreSelect = document.getElementById('genre');
    const moodBefore = document.getElementById("mood-before");
    const mood = document.getElementsByClassName("mood")[0];
    const moodSelect = document.getElementById('mood');

    const iframeContainer = document.createElement("div");
    iframeContainer.style.position = "fixed";
    iframeContainer.style.top = "50%";
    iframeContainer.style.left = "50%";
    iframeContainer.style.transform = "translate(-50%, -50%)";
    iframeContainer.style.width = "90%";
    iframeContainer.style.maxWidth = "774px";
    iframeContainer.style.width = "90%";
    iframeContainer.style.height = "82vh";
    iframeContainer.style.background = "rgb(17 24 39 / 85%)";
    iframeContainer.style.display = "none";
    iframeContainer.style.zIndex = "1000";
    iframeContainer.style.padding = "10px";
    iframeContainer.style.borderRadius = "9px";
    iframeContainer.style.borderRadius = "9px";
    iframeContainer.style.border = "2px solid rgb(41, 236, 254)";
    iframeContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";

    const iframe = document.createElement("iframe");
    iframe.src = "https://docs.google.com/forms/d/e/1FAIpQLSd8Fdms4rUhOCXAgrq9XJdCNeJHg8EX3SS9F6I1PeTM7shh8A/viewform?embedded=true";
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.style.border = "none";
    iframeContainer.appendChild(iframe);

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "X";
    closeButton.style.fontSize = "27px";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.background = "rgb(194, 0, 0)";
    closeButton.style.fontWeight = "600";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.padding = "1px 11px";
    closeButton.style.cursor = "pointer";
    closeButton.style.borderRadius = "8px";
    closeButton.style.margin = "-6px";

    closeButton.addEventListener("click", () => {
        iframeContainer.style.display = "none";
    });
    iframeContainer.appendChild(closeButton);

    document.body.appendChild(iframeContainer);

    reqSongButton.addEventListener("click", () => {
        iframeContainer.style.display = "block";
    });

    document.querySelector('.randomSong').addEventListener('click', () => {
        // Sare songs collect karo
        const songs = document.querySelectorAll('.item');

        // Random song select karo
        const randomIndex = Math.floor(Math.random() * songs.length);
        const randomSong = songs[randomIndex];

        // Pehle ke highlighted songs ka highlight hatayein (agar koi hai toh)
        songs.forEach(song => {
            song.children[0].children[1].children[0].style.color = '';
            song.children[0].children[1].children[1].style.color = '';
            song.classList.remove('bg-gray-900');
        });

        // Highlight aur scroll karne ka function call karo
        highlightElement(randomSong);

        // Random song ka naam console me show karo
        const songTitle = randomSong.querySelector('.song-title').textContent;
        // console.log(`Randomly selected song: ${songTitle}`);
    });

    document.querySelector('.randomSong').addEventListener('click', function () {
        // Generate a random number between 1 and 6
        const randomNumber = Math.floor(Math.random() * 6) + 1;

        // Change the dice icon based on the random number
        const diceIcon = this.querySelector('i');
        diceIcon.className = `bx bxs-dice-${randomNumber}`;

        // Optionally, you can add a small animation to make it look more interactive
        this.classList.add('rolling');
        setTimeout(() => this.classList.remove('rolling'), 200);
    });


    genreBefore.addEventListener('click', () => {
        genreBefore.classList.add("hidden");
        genre.classList.remove("hidden");
        genre.classList.add("flex");
        updateSongsByGenre('Slowed & Reverb'); // Default value for initialization
    });

    moodBefore.addEventListener('click', () => {
        moodBefore.classList.add("hidden");
        mood.classList.remove("hidden");
        mood.classList.add("flex");
        updateSongsByMood('Ghazal'); // Default value for initialization
    });

    function updateSongsByGenre(selectedGenre) {
        const genreMap = {
            'Gym': 'Genres/Gym.json',
            'Hindi-New': 'Genres/Hindi-New.json',
            'Hindi-Old': 'Genres/Hindi-Old.json',
            'Slowed & Reverb': 'Genres/Slowed-Reverb.json',
            'Punjabi': 'Genres/Punjabi.json',
            'Meditation': 'Genres/Meditation.json'
        };

        const jsonFile = genreMap[selectedGenre] || 'Allsongs/songs.json';
        document.querySelector('.without-ads').innerHTML = `${selectedGenre} Songs - No Ads 🔥`;

        fetch(jsonFile)
            .then(response => response.json())
            .then(data => {
                songs = data.sort((a, b) => a.title.localeCompare(b.title));
                loadSongList();
            })
            .catch(error => console.error('Error fetching songs:', error));
    }
function updateSongsByMood(selectedMood) {
    const moodMap = {
        'Ghazal': 'Mood/Ghazal.json', // optional: keeping this if needed
        // 'Happy': 'Mood/Happy.json',
        'Inspirational': 'Mood/Inspirational.json',
        'Instrumental': 'Mood/Instrumental.json',
        'Mashup': 'Mood/Mashup.json',
        'Motivational': 'Mood/Motivational.json',
        'Nostalgic': 'Mood/Nostalgic.json',
        'Party': 'Mood/Party.json',
        'Patriotic': 'Mood/Patriotic.json',
        'Punjabi': 'Mood/Punjabi.json',
        'Rap': 'Mood/Rap.json',
        'Romantic': 'Mood/Romantic.json',
        'Sad': 'Mood/Sad.json',
        'Spiritual': 'Mood/Spiritual.json'
    };

        const jsonFile = moodMap[selectedMood] || 'Allsongs/songs.json';
        document.querySelector('.without-ads').innerHTML = `${selectedMood} Songs - No Ads 🔥`;

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

    moodSelect.addEventListener('change', () => {
        const selectedMood = moodSelect.value;
        updateSongsByMood(selectedMood);
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

        songs = playlist.filter((song, index, self) =>
            index === self.findIndex((s) => s.image === song.image)
        );

        // Loop through filtered songs and render them
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
                
            </div>`
                ;

            itemDiv.addEventListener('click', (event) => {
                const addToPlaylistButton = event.target.closest('.add-to-playlist');
                if (addToPlaylistButton) {
                    event.stopPropagation();

                    const imageURL = trimAndDecodeURL(addToPlaylistButton.parentElement.parentElement.children[0].children[0].src);
                    const title = addToPlaylistButton.parentElement.parentElement.children[0].children[1].children[0].textContent;
                    const artist = addToPlaylistButton.parentElement.parentElement.children[0].children[1].children[1].textContent;
                    let fileURL;
                    fileURL = modifyAndDecodeURL(addToPlaylistButton.parentElement.parentElement.children[0].children[0].src);

                    const songData = {
                        image: imageURL,
                        file: fileURL,
                        title: title,
                        artist: artist
                    };

                    playlist.push(songData);
                    console.log(JSON.stringify(playlist, null, 2));
                    return;
                }
                playSong(index);
            });

            arrayDiv.appendChild(itemDiv);
        });
    }


    function fetching(filename) {
        fetch(`${filename}`)
            .then(response => response.json())
            .then(data => {
                songs = data.sort((a, b) => a.title.localeCompare(b.title)); // Sort songs alphabetically
                loadSongList();
            })
            .catch(error => console.error('Error fetching songs:', error));
    }
    title.addEventListener('click', () => {
        fetching('Allsongs/songs.json')

        document.querySelector('.without-ads').innerHTML = `Non-Stop 400+ Songs - No Ads 🔥`
    })

    playlistButton.addEventListener('click', () => {
        document.querySelector('.without-ads').innerHTML = `Your Instant Playlist 🔥`

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
        updateSongsBySinger('Jagjit Singh');
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
            'Jagjit Singh': 'Singersongs/Jagjit Singh.json',
            'Akhil Sachdeva': 'Singersongs/Akhil Sachdeva.json',
            'Alka Yagnik': 'Singersongs/Alka Yagnik.json',
            'Amit Trivedi': 'Singersongs/Amit Trivedi.json',
            'Ankit Tiwari': 'Singersongs/Ankit Tiwari.json',
            'AP Dhillon': 'Singersongs/AP Dhillon.json',
            'AR Rahman': 'Singersongs/AR Rahman.json',
            'Arijit Singh': 'Singersongs/Arijit Singh.json',
            'Arko': 'Singersongs/Arko.json',
            'Armaan Malik': 'Singersongs/Armaan Malik.json',
            'Asha Bhosle': 'Singersongs/Asha Bhosle.json',
            'Atif Aslam': 'Singersongs/Atif Aslam.json',
            'Ayushmann Khurrana': 'Singersongs/Ayushmann Khurrana.json',
            'B Praak': 'Singersongs/B Praak.json',
            'Bhupinder Singh': 'Singersongs/Bhupinder Singh.json',
            'Chandan Daas': 'Singersongs/Chandan Daas.json',
            'Faheem Abdullah, Rauhan Malik, Amir Ameer': 'Singersongs/Faheem Abdullah, Rauhan Malik, Amir Ameer.json',
            'Ghulam Ali': 'Singersongs/Ghulam Ali.json',
            'Himesh Reshammiya': 'Singersongs/Himesh Reshammiya.json',
            'Javed Ali': 'Singersongs/Javed Ali.json',
            'Javed Bashir': 'Singersongs/Javed Bashir.json',
            'Jubin Nautiyal': 'Singersongs/Jubin Nautiyal.json',
            'Kailash Kher': 'Singersongs/Kailash Kher.json',
            'Kishore Kumar': 'Singersongs/Kishore Kumar.json',
            'KK': 'Singersongs/KK.json',
            'Kumar Sanu': 'Singersongs/Kumar Sanu.json',
            'Lata Mangeshkar': 'Singersongs/Lata Mangeshkar.json',
            'Mehndi Hasan': 'Singersongs/Mehndi Hasan.json',
            'Mohammed Irfan': 'Singersongs/Mohammed Irfan.json',
            'Mohammed Rafi': 'Singersongs/Mohammed Rafi.json',
            'Mohit Chauhan': 'Singersongs/Mohit Chauhan.json',
            'Monali Thakur': 'Singersongs/Monali Thakur.json',
            'Mukesh': 'Singersongs/Mukesh.json',
            'Palak Muchhal': 'Singersongs/Palak Muchhal.json',
            'Papon': 'Singersongs/Papon.json',
            'Rahat Fateh Ali Khan': 'Singersongs/Rahat Fateh Ali Khan.json',
            'Raj Barman': 'Singersongs/Raj Barman.json',
            'Roopkumar Rathod': 'Singersongs/Roopkumar Rathod.json',
            'Shaan': 'Singersongs/Shaan.json',
            'Shabbir Kumar': 'Singersongs/Shabbir Kumar.json',
            'Shafaqat Amanat Ali': 'Singersongs/Shafaqat Amanat Ali.json',
            'Shankar Mahadevan': 'Singersongs/Shankar Mahadevan.json',
            'Shreya Ghoshal': 'Singersongs/Shreya Ghoshal.json',
            'Sonu Nigam': 'Singersongs/Sonu Nigam.json',
            'Sukhwinder Singh': 'Singersongs/Sukhwinder Singh.json',
            'Udit Narayan': 'Singersongs/Udit Narayan.json',
            'Vishal Dadlani': 'Singersongs/Vishal Dadlani.json'
        };


        const jsonFile = singerMap[selectedSinger] || 'Allsongs/songs.json';
        document.querySelector('.without-ads').innerHTML = `${selectedSinger} Songs - No Ads 🔥`;

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

        // Handle invalid index
        if (index < 0) return;

        if (index >= songs.length) {
            if (isLooping) {
                index = 0; // Restart from first song
            } else {
                return; // Stop playback on last song
            }
        }

        currentIndex = index;
        const song = songs[currentIndex];

        // Stop current playback only if audio is playing
        if (!audio.paused) {
            audio.pause();
        }

        // Ensure previous event listeners are removed to prevent duplicate calls
        audio.onended = null;

        // Load new song
        audio.src = song.file;
        audio.load(); // Ensure the new song is loaded properly

        audio.playbackRate = currentPlaybackRate;

        audio.play().then(() => {
            musicplayer.style.animationPlayState = 'running';
        }).catch(error => console.error("Playback error:", error));

        updatePlayer(song);
        enableAllButtons();

        // Fix song skipping issue
        audio.onended = () => {
            if (currentIndex === songs.length - 1 && !isLooping) {
                return; // Stop playback at last song if looping is off
            }
            playSong(currentIndex + 1); // Play next song
        };
    }



    function updatePlayer(song) {
        songImage.src = song.image;
        songImage.style.objectFit = "cover";
        songImage.style.objectPosition = "top";

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
            if (parseInt(item.dataset.index) === currentIndex || songDescription.style.display === 'flex' && (item.querySelector('.song-title').textContent === songTitle.textContent && item.querySelector('.song-artist').textContent === songArtist.textContent)) {
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
            const songTitleElement2 = item.querySelector('.song-artist');
            item.classList.remove('bg-gray-700', 'bg-gray-600'); // Add border class

            if (songTitleElement.textContent === songTitle.textContent && songTitleElement2.textContent === songArtist.textContent) {
                item.classList.add('border-[1px]', 'border-[#29ecfe]', 'bg-gray-600'); // Add border class
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
            KeyR: () => document.querySelector('.randomSong').click(),
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
});
