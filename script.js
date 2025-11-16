document.addEventListener('DOMContentLoaded', () => {

  let songs = [], currentIndex = 0;
  let playlist = [], audio = new Audio();
  let animationAllowed = true, animationInterval = null, scrollCooldown = false;
  let lastPlayedSong = null;

  // const loopButton = document.querySelector('.loop');
  const reqSongButton = document.querySelector(".reqSong");
  const playPauseButton = document.getElementById('play-pause');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const songImage = document.getElementById('song-image');
  const songTitle = document.querySelector('.song-title');
  const songArtist = document.querySelector('.song-artist');
  const progress = document.getElementById('progress');
  const timeCompleted = document.getElementById('timecompleted');
  const timeTotal = document.getElementById('timetotal');
  const songDescription = document.querySelector('.song-description');
  const speedSelect = document.getElementById('speed');
  const forward = document.getElementById('forward');
  const rewind = document.getElementById('rewind');
  const volumeSlider = document.querySelector('.volume-slider');
  const musicplayer = document.querySelector('.musicplayer');
  const playlistButton = document.querySelector(".yourPlaylist");
  musicplayer.style.animationPlayState = 'paused';
  let currentPlaybackRate = parseFloat(speedSelect.value);

  let isLoopingSingle = false;
  let isLoopingPlaylist = false;

  // ========== LOOP BUTTONS ==========
  const loopButtonSingle = document.getElementById('loop-btn-single');
  const loopButtonPlaylist = document.getElementById('loop-btn-playlist');

  loopButtonSingle.addEventListener('click', () => {
    isLoopingSingle = !isLoopingSingle;
    audio.loop = isLoopingSingle;
    loopButtonSingle.style.color = isLoopingSingle ? 'red' : 'white';
    loopButtonSingle.style.backgroundColor = isLoopingSingle ? '#3c4148ff' : '#4b5563';

    loopButtonSingle.title = isLoopingSingle ? "Single Loop ON" : "Single Loop OFF";

    if (isLoopingSingle) {
      isLoopingPlaylist = false;
      loopButtonPlaylist.style.color = 'white';
    }

    console.log("🎯 Single Loop:", isLoopingSingle, "| Playlist Loop:", isLoopingPlaylist);
  });

  loopButtonPlaylist.addEventListener('click', () => {
    isLoopingPlaylist = !isLoopingPlaylist;
    loopButtonPlaylist.style.color = isLoopingPlaylist ? 'red' : 'white';
    loopButtonPlaylist.title = isLoopingPlaylist ? "Playlist Loop ON" : "Playlist Loop OFF";

    if (isLoopingPlaylist) {
      isLoopingSingle = false;
      audio.loop = false;
      loopButtonSingle.style.color = 'white';
    }

    console.log("🎯 Playlist Loop:", isLoopingPlaylist, "| Single Loop:", isLoopingSingle);
  });



  // --------- Text Animation ---------
  const texts = ["Mood", "Genre", "Singer"];
  let textIndex = 0;

  const textEl = document.getElementById("feature-text");
  const featureBtn = document.getElementById("feature-button");
  const modal = document.getElementById("selectionModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const headingText = document.getElementById("heading-text");
  const spinner = document.getElementById("loading-spinner");

  function animateText() {
    textIndex = (textIndex + 1) % texts.length;
    textEl.classList.add("opacity-0");
    setTimeout(() => {
      textEl.textContent = texts[textIndex];
      textEl.classList.remove("opacity-0");
      textEl.classList.add("blur-slide");
      setTimeout(() => textEl.classList.remove("blur-slide"), 400);
    }, 200);
  }

  window.addEventListener("scroll", () => {
    if (animationAllowed && !scrollCooldown) {
      animateText();
      if (!animationInterval) {
        animationInterval = setInterval(() => {
          if (animationAllowed) animateText();
          else clearInterval(animationInterval);
        }, 3000);
      }
      scrollCooldown = true;
      setTimeout(() => scrollCooldown = false, 3000);
    }
  });

  featureBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    animationAllowed = false;
    clearInterval(animationInterval);
    animationInterval = null;
  });

  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));


  const iframeContainer = document.createElement("div");
  Object.assign(iframeContainer.style, {
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%", maxWidth: "774px", height: "82vh",
    background: "rgb(17 24 39 / 85%)", display: "none",
    zIndex: "1000", padding: "10px", borderRadius: "9px",
    border: "2px solid rgb(41, 236, 254)",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  });

  const iframe = document.createElement("iframe");
  Object.assign(iframe, {
    src: "https://docs.google.com/forms/d/e/1FAIpQLSd8Fdms4rUhOCXAgrq9XJdCNeJHg8EX3SS9F6I1PeTM7shh8A/viewform?embedded=true",
    width: "100%", height: "100%", style: "border:none"
  });
  iframeContainer.appendChild(iframe);

  const closeButton = document.createElement("button");
  closeButton.innerText = "X";
  Object.assign(closeButton.style, {
    fontSize: "27px", position: "absolute", top: "10px", right: "10px",
    background: "rgb(194, 0, 0)", fontWeight: "600", color: "white",
    border: "none", padding: "1px 11px", cursor: "pointer",
    borderRadius: "8px", margin: "-6px"
  });
  closeButton.addEventListener("click", () => iframeContainer.style.display = "none");
  iframeContainer.appendChild(closeButton);
  document.body.appendChild(iframeContainer);


  reqSongButton.addEventListener("click", () => iframeContainer.style.display = "block");

  document.querySelector('.randomSong').addEventListener('click', () => {
    const items = document.querySelectorAll('.item');
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomSong = items[randomIndex];

    // 🔹 Sab songs ka reset
    items.forEach(song => {
      song.classList.remove('bg-gray-900');
      const title = song.querySelector('.song-title');
      const artist = song.querySelector('.song-artist');
      if (title) title.style.color = '';
      if (artist) artist.style.color = '';
    });

    // 🔹 Sirf selected song highlight
    highlightElement(randomSong);

    const songTitle = randomSong.querySelector('.song-title').textContent;
    console.log(`Randomly selected song: ${songTitle}`);
  });

  document.querySelector('.randomSong').addEventListener('click', function () {
    const randomNumber = Math.floor(Math.random() * 6) + 1;
    const diceIcon = this.querySelector('i');
    diceIcon.className = `bx bxs-dice-${randomNumber}`;
    this.classList.add('rolling');
    setTimeout(() => this.classList.remove('rolling'), 200);
  });


  // --------- Category Option Selection ---------
  document.querySelectorAll(".option-item").forEach(option => {
    option.addEventListener("click", () => {
      const category = option.dataset.category;
      const value = option.dataset.value;
      const jsonFile = `${category}/${value}.json`;

      if (headingText) headingText.textContent = "Loading...";
      if (spinner) spinner.classList.remove("hidden");

      textEl.textContent = value;
      modal.classList.add("hidden");
      animationAllowed = false;

      fetch(jsonFile)
        .then(res => res.json())
        .then(data => {
          songs = data.sort((a, b) => a.title.localeCompare(b.title));
          loadSongList();
          setTimeout(() => {
            headingText.textContent = `${value} Songs - Ad Free 🔥`;
            spinner.classList.add("hidden");
          }, 0);
        })
        .catch(err => {
          console.error('Error fetching songs:', err);
          headingText.textContent = "Something went wrong ❌";
          spinner.classList.add("hidden");
        });
    });
  });

  // === URL Utility ===
  const BASE_AUDIO = 'https://itsnjedits.github.io/soundaura/';
  const BASE_THUMB = 'https://itsnjedits.github.io/soundaura/Thumbnails';

  const trimAndDecodeURL = url =>
    url.startsWith(BASE_AUDIO)
      ? decodeURIComponent(url.slice(BASE_AUDIO.length))
      : (console.error('Invalid base URL.'), url);

  const modifyAndDecodeURL = url =>
    url.startsWith(BASE_THUMB)
      ? decodeURIComponent(url.replace(BASE_THUMB, 'Audio').replace('_thumbnail.jpg', '.mp3'))
      : (console.error('Invalid base URL.'), url);

  // === Global Drag Variables (fix scope issue) ===
  let dragSrcEl = null;
  let isDragging = false;
  let currentY = 0;
  let scrollAnimation;

  const updateY = (y) => { if (typeof y === 'number') currentY = y; };

  function startAutoScroll() {
    function step() {
      if (!isDragging) return;

      const { topMargin, bottomMargin, baseSpeed } = getEdgeConfig();
      const distTop = currentY;
      const distBottom = window.innerHeight - currentY;

      let delta = 0;

      if (distTop < topMargin) {
        const t = (topMargin - distTop) / topMargin;
        delta = -(3 + Math.round(t * baseSpeed));
      } else if (distBottom < bottomMargin) {
        const t = (bottomMargin - distBottom) / bottomMargin;
        delta = (3 + Math.round(t * baseSpeed));
      }

      if (delta !== 0) window.scrollBy(0, delta);
      scrollAnimation = requestAnimationFrame(step);
    }

    cancelAnimationFrame(scrollAnimation);
    scrollAnimation = requestAnimationFrame(step);
  }

  function stopAutoScroll() {
    cancelAnimationFrame(scrollAnimation);
  }

  function getEdgeConfig() {
    const header = document.querySelector('header');
    const player = document.querySelector('.player');
    const headH = header ? header.getBoundingClientRect().height : 0;
    const playH = player ? player.getBoundingClientRect().height : 0;

    return {
      topMargin: Math.max(60, headH + 20),
      bottomMargin: Math.max(60, playH + 20),
      baseSpeed: 14
    };
  }

  // === DOM Loaded ===
  window.addEventListener('DOMContentLoaded', () => {
    const saved = loadPlaylistFromLocalStorage();
    playlistButton.click();
    headingText.textContent = saved.length
      ? `Add, Listen, Enjoy - Ad Free 🔥`
      : "Welcome! Start building your Playlist 🎵";

    saved.length
      ? (playlist = [...saved], renderPlaylist(playlist, document.querySelector('.array'), true))
      : document.querySelector('.array').innerHTML = `
      <div class="max-md:text-base text-center pt-10 text-[#29ecfe] text-xl">
        No songs in your playlist yet. Click '+' to add!
      </div>
      <div class="max-md:text-base text-center pb-10 text-[#2b8bff] text-xl">
        Go to <b>\"Mood\"</b> or <u id="get-started-link" class="hover:text-[#29ecfe] cursor-pointer font-bold">Get Started</u>
      </div>`;

    // ✅ Restore last played song on reload
    const lastPlayed = JSON.parse(localStorage.getItem('lastPlayedSong'));
    if (lastPlayed) {
      currentIndex = lastPlayed.index ?? 0; // ✅ restore index or fallback to 0
      audio.src = lastPlayed.file;
      audio.load();
      audio.currentTime = lastPlayed.time || 0;

      songImage.src = lastPlayed.image;
      Object.assign(songImage.style, { objectFit: "cover", objectPosition: "top" });
      songTitle.textContent = lastPlayed.title;
      songArtist.textContent = lastPlayed.artist;
      songDescription.classList.remove('opacity-0');
      songDescription.style.display = 'flex';
      playPauseButton.innerHTML = `<i class='bx bx-play'></i>`;
      lastPlayedSong = lastPlayed;

      updateTime();

      let lastUpdateTime = 0;

      audio.ontimeupdate = () => {
        const now = Date.now();
        if (now - lastUpdateTime < 500) return;  // 500ms = 2 bar per second
        lastUpdateTime = now;

        if (!audio.paused && audio.currentTime > 0 && lastPlayedSong) {
          saveLastPlayedSong(lastPlayedSong, audio.currentTime, currentIndex);
        }
      };

    }

  });

  document.addEventListener('click', e => e.target?.id === 'get-started-link' && document.getElementById("feature-button")?.click());

  document.getElementById("allSongsImage").addEventListener("click", () => {
    const jsonFile = "all-songs/songs.json";
    textEl.textContent = "All Songs";
    modal.classList.add("hidden");
    animationAllowed = false;
    headingText && (headingText.textContent = "Loading...");
    spinner && spinner.classList.remove("hidden");

    fetch(jsonFile)
      .then(res => res.json())
      .then(data => {
        songs = data.sort((a, b) => a.title.localeCompare(b.title));
        loadSongList();
        setTimeout(() => {
          headingText.textContent = `All Songs - Ad Free 🔥`;
          spinner.classList.add("hidden");
        }, 0);
      })
      .catch(err => {
        console.error('Error fetching all songs:', err);
        headingText.textContent = "Something went wrong ❌";
        spinner.classList.add("hidden");
      });
  });

  // === LocalStorage ===
  const savePlaylistToLocalStorage = () => localStorage.setItem('userPlaylist', JSON.stringify(playlist));
  const loadPlaylistFromLocalStorage = () => JSON.parse(localStorage.getItem('userPlaylist')) || [];

  // === Playlist Render with Drag Support ===
  function renderPlaylist(list, container, isRemovable = false) {
    container.innerHTML = '';
    list.forEach((song, index) => {
      const div = document.createElement('div');
      div.className =
        'item flex justify-between items-center bg-gray-700 rounded-xl p-2 max-md:p-1 mx-4 max-md:mx-2 min-md:hover:bg-gray-600 duration-300 cursor-pointer';
      div.dataset.index = index;
      div.draggable = false;

      div.innerHTML = `
      <div class="text-white flex items-center gap-x-4 max-md:gap-x-2">
        ${isRemovable ? `<span class="drag-handle cursor-grab text-gray-400 text-2xl pl-2">&#9776;</span>` : ""}
        <img src="${song.image}" class="max-md:h-12 max-md:w-20 w-36 h-20 object-cover rounded-lg object-top" alt="${song.title}">
        <div class="text">
          <h2 class="max-md:text-base song-title font-semibold text-xl max-[500px]:text-[13.5px]">${song.title}</h2>
          <p class="song-artist max-md:text-sm text-gray-300 max-[500px]:text-[12px]">${song.artist}</p>
        </div>
      </div>
      <div class="song-play flex items-center gap-x-2 mr-3 max-md:mr-2 max-md:gap-x-1">
  <div class="visualizer hidden">${[1, 2, 3, 4, 5].map(i => `<div class="bar max-md:w-[2px] bar${i}"></div>`).join('')}</div>
  ${isRemovable ? `
    <p class="download-song text-4xl text-green-400 cursor-pointer hover:text-green-300 max-md:text-xl">
      <i class='bx bx-download'></i>
    </p>
  ` : ""}
  <p class="text-5xl ${isRemovable ? 'remove-from-playlist' : 'add-to-playlist'} text-[#2b8bff] cursor-pointer hover:text-[#29ecfe] max-md:text-2xl">
    <i class='bx bx-${isRemovable ? 'minus' : 'plus'}'></i>
  </p>
</div>
`;

      // ✅ Add/Remove
      div.querySelector(isRemovable ? '.remove-from-playlist' : '.add-to-playlist')
        .addEventListener('click', e => {
          e.stopPropagation();
          if (isRemovable) {
            removeFromPlaylistByData(song);
            playlistButton.click();
          } else {
            addToPlaylist(div);
          }
        });

      // ✅ Download button
      if (isRemovable) {
        const downloadBtn = div.querySelector('.download-song');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', e => {
            e.stopPropagation();

            // file URL ko sahi karo (thumbnail se audio nikaalna ho to modifyAndDecodeURL use karo)
            const fileURL = song.file || modifyAndDecodeURL(song.image);

            const link = document.createElement('a');
            link.href = fileURL;
            link.download = `${song.title} - ${song.artist}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
        }
      }

      // ✅ Play on click
      div.addEventListener('click', () => playSong(index));
      container.appendChild(div);



      // ✅ Only hamburger enables drag
      if (isRemovable) {
        const handle = div.querySelector('.drag-handle');
        if (handle) {
          // Desktop
          handle.addEventListener('mousedown', () => { div.draggable = true; });
          handle.addEventListener('mouseup', () => { div.draggable = false; });

          // Mobile
          handle.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return;
            dragSrcEl = div;
            isDragging = true;
            div.draggable = true;
            div.classList.add('opacity-50');
            updateY(e.touches[0].clientY);
            startAutoScroll();
          }, { passive: true });

          handle.addEventListener('touchmove', e => {
            if (!isDragging) return;
            e.preventDefault();
            updateY(e.touches[0].clientY);

            const el = document.elementFromPoint(e.touches[0].clientX, currentY)?.closest('.item');
            if (el && el !== dragSrcEl) {
              const rect = el.getBoundingClientRect();
              const after = currentY - rect.top > rect.height / 2;
              after ? el.after(dragSrcEl) : el.before(dragSrcEl);
            }
          }, { passive: false });

          handle.addEventListener('touchend', () => {
            if (isDragging) {
              isDragging = false;
              div.draggable = false;
              div.classList.remove('opacity-50');
              stopAutoScroll();
              finalizeOrder(container);
            }
          }, { passive: true });
        }
      }
    });

    if (isRemovable) enableDragAndDrop(container);
  }

  // === Drag & Drop Desktop ===
  function enableDragAndDrop(container) {
    document.addEventListener('dragover', (e) => { if (isDragging) updateY(e.clientY); }, { passive: true });
    window.addEventListener('dragover', (e) => { if (isDragging) updateY(e.clientY); }, { passive: true });

    container.querySelectorAll('.item').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragSrcEl = item;
        isDragging = true;
        updateY(e.clientY);
        startAutoScroll();

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'reorder');
        item.classList.add('opacity-50');
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        updateY(e.clientY);

        const target = e.target.closest('.item');
        if (target && target !== dragSrcEl) {
          const rect = target.getBoundingClientRect();
          const after = e.clientY - rect.top > rect.height / 2;
          after ? target.after(dragSrcEl) : target.before(dragSrcEl);
        }
      });

      item.addEventListener('dragend', () => {
        isDragging = false;
        stopAutoScroll();
        finalizeOrder(container);
      });
    });
  }

  // === Save Order & Refresh Playlist ===
  function finalizeOrder(container) {
    container.querySelectorAll('.item').forEach(it => it.classList.remove('opacity-50'));

    const newOrder = [];
    container.querySelectorAll('.item').forEach(it => {
      const idx = parseInt(it.dataset.index);
      newOrder.push(playlist[idx]);
    });

    playlist = newOrder;
    savePlaylistToLocalStorage();

    // ✅ Agar koi song chal raha hai to uska naya index dhoondo
    if (lastPlayedSong) {
      const newIdx = playlist.findIndex(
        s => s.title === lastPlayedSong.title && s.artist === lastPlayedSong.artist
      );
      if (newIdx !== -1) {
        currentIndex = newIdx;
      }
    }

    renderPlaylist(playlist, container, true);
    playlistButton.click();
  }

  function removeFromPlaylistByData(songToRemove) {
    const i = playlist.findIndex(s =>
      s.title === songToRemove.title &&
      s.artist === songToRemove.artist &&
      s.image === songToRemove.image
    );

    if (i !== -1) {
      const wasPlaying = lastPlayedSong &&
        songToRemove.title === lastPlayedSong.title &&
        songToRemove.artist === lastPlayedSong.artist;

      playlist.splice(i, 1);
      savePlaylistToLocalStorage();
      renderPlaylist(playlist, document.querySelector('.array'), true);

      // ✅ Agar remove hua song hi chal raha tha
      if (wasPlaying) {
        if (i < playlist.length) {
          playSong(i); // uske baad wala bajao
        } else if (playlist.length > 0) {
          playSong(0); // last remove hua tha, to first bajao
        } else {
          audio.pause(); // sab remove ho gaya
          currentIndex = 0;
          lastPlayedSong = null;
        }
      } else {
        // ✅ Agar koi aur remove hua hai, index re-sync karo
        if (lastPlayedSong) {
          const newIdx = playlist.findIndex(
            s => s.title === lastPlayedSong.title && s.artist === lastPlayedSong.artist
          );
          if (newIdx !== -1) {
            currentIndex = newIdx;
          }
        }
      }
    }
  }


  function addToPlaylist(div) {
    const img = div.querySelector('img');
    const title = div.querySelector('.song-title').textContent;
    const artist = div.querySelector('.song-artist').textContent;
    const imageURL = trimAndDecodeURL(img.src);
    const fileURL = modifyAndDecodeURL(img.src);

    const exists = playlist.some(song => song.title === title && song.artist === artist);
    const btn = document.querySelector('.yourPlaylist');
    const text = btn.querySelector('p');

    if (exists) {
      text.style.transition = 'opacity 0.3s';
      text.style.opacity = '0';
      setTimeout(() => {
        Object.assign(text, {
          textContent: "Already in Playlist ✖",
          style: { ...text.style, opacity: '1' }
        });
        btn.style.backgroundColor = "#d73a49";
        btn.style.color = "#111";
        text.classList.add("text-sm");
      }, 300);
      clearTimeout(window.resetPlaylistBtnTimer);
      window.resetPlaylistBtnTimer = setTimeout(() => {
        text.style.opacity = '0';
        setTimeout(() => {
          Object.assign(text, { textContent: "My Playlist", style: { ...text.style, opacity: '1' } });
          btn.style.backgroundColor = "";
          btn.style.color = "";
          text.classList.remove("text-sm");
        }, 300);
      }, 1000);
      return;
    }

    playlist.push({ image: imageURL, file: fileURL, title, artist });
    savePlaylistToLocalStorage();

    text.style.transition = 'opacity 0.3s';
    btn.style.transition = 'background-color 0.3s, color 0.3s';
    text.style.opacity = '0';

    setTimeout(() => {
      Object.assign(text, {
        textContent: "Song Added ✔",
        style: { ...text.style, opacity: '1' }
      });
      btn.style.backgroundColor = "#45da67ff";
      btn.style.color = "#111";
      text.classList.add("text-sm");
    }, 300);

    clearTimeout(window.resetPlaylistBtnTimer);
    window.resetPlaylistBtnTimer = setTimeout(() => {
      text.style.opacity = '0';
      setTimeout(() => {
        Object.assign(text, { textContent: "My Playlist", style: { ...text.style, opacity: '1' } });
        btn.style.backgroundColor = "";
        btn.style.color = "";
        text.classList.remove("text-sm");
      }, 300);
    }, 1000);
  }

  playlistButton.addEventListener('click', () => {
    const saved = loadPlaylistFromLocalStorage();
    songs = [...new Set(saved.map(JSON.stringify))].map(JSON.parse);
    document.getElementById('heading-text').textContent = `Add, Listen, Enjoy - Ad Free 🔥`;
    renderPlaylist(songs, document.querySelector('.array'), true);
  });

  const loadSongList = () => renderPlaylist(songs, document.querySelector('.array'));

  const fetching = filename => {
    fetch(filename)
      .then(res => res.json())
      .then(data => {
        songs = data.sort((a, b) => a.title.localeCompare(b.title));
        loadSongList();
      })
      .catch(err => console.error('Error fetching songs:', err));
  };

  // ========== BUTTON STATE MANAGEMENT ==========

  // ✅ Save last played song with index and currentTime
  function saveLastPlayedSong(song, currentTime = 0, index = currentIndex) {
    if (!song) return;
    const lastPlayed = {
      title: song.title,
      artist: song.artist,
      image: song.image,
      file: song.file,
      time: currentTime,
      index: index // ✅ Save current index
    };
    localStorage.setItem('lastPlayedSong', JSON.stringify(lastPlayed));
  }



  function toggleButtons(disabled) {
    const btnStates = [
      [playPauseButton, 'hover:min-md:bg-blue-400'],
      [prevButton, 'min-md:hover:bg-gray-500'],
      [nextButton, 'min-md:hover:bg-gray-500'],
      [forward, 'min-md:hover:bg-gray-500'],
      [rewind, 'min-md:hover:bg-gray-500']
    ];
    btnStates.forEach(([btn, cls]) => {
      btn.disabled = disabled;
      btn.classList[disabled ? 'remove' : 'add'](cls);
    });
  }

  // ========== PLAY A SONG ==========
  // ✅ PLAY A SONG
  function playSong(index) {
    if (songs.length === 0) return;

    // Wrap-around (looping)
    if (index < 0 && isLoopingPlaylist) index = songs.length - 1;
    if (index >= songs.length && isLoopingPlaylist) index = 0;
    if (index < 0 || index >= songs.length) return; // Out of range without loop mode

    currentIndex = index;
    const song = songs[currentIndex];
    lastPlayedSong = song;

    // Stop any currently playing song
    audio.pause();
    audio.onended = null;
    audio.src = song.file;
    audio.load();
    audio.playbackRate = currentPlaybackRate;

    // Play song
    audio.play().then(() => {
      musicplayer.style.animationPlayState = 'running';
    }).catch(console.error);

    // ✅ Update UI and Metadata
    updatePlayer(song);
    toggleButtons(false);
    saveLastPlayedSong(song, 0, currentIndex);

    // ==============================
    // 🎧 AUDIO ENDED EVENT HANDLER
    // ==============================
    audio.onended = () => {
      console.log("🎵 Song ended | Index:", currentIndex);
      console.log("Loop States => Single:", isLoopingSingle, "| Playlist:", isLoopingPlaylist);

      if (isLoopingSingle) {
        // Single song loop
        audio.loop = true;
        return;
      } else {
        audio.loop = false;
      }

      // Next song logic
      if (currentIndex < songs.length - 1) {
        playSong(currentIndex + 1);
      } else if (isLoopingPlaylist) {
        playSong(0);
      } else {
        audio.pause();
        playPauseButton.innerHTML = `<i class='bx bx-play'></i>`;
      }
    };

    // ✅ Save playback time periodically
    let lastUpdateTime = 0;

    audio.ontimeupdate = () => {
      const now = Date.now();
      if (now - lastUpdateTime < 500) return;  // 500ms = 2 bar per second
      lastUpdateTime = now;

      if (!audio.paused && audio.currentTime > 0 && lastPlayedSong) {
        saveLastPlayedSong(lastPlayedSong, audio.currentTime, currentIndex);
      }
    };

  }



  function updatePlayer(song) {
    // ✅ Update UI
    songImage.src = song.image;
    Object.assign(songImage.style, { objectFit: "cover", objectPosition: "center" });
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    songDescription.classList.remove('opacity-0');
    songDescription.style.display = 'flex';
    playPauseButton.innerHTML = `<i class='bx bx-pause'></i>`;
    updateButtons();
    updateTime();
    updateVisualizers();
    highlightCurrentSong();

    // ✅ Media Session Metadata
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [{ src: song.image, sizes: "512x512", type: "image/png" }]
      });

      // 🎛️ Controls
      const actions = {
        play: () => audio.play(),
        pause: () => audio.pause(),
        previoustrack: () => playSong(currentIndex - 1),
        nexttrack: () => playSong(currentIndex + 1),
        seekbackward: (d) => (audio.currentTime = Math.max(audio.currentTime - (d.seekOffset || 10), 0)),
        seekforward: (d) => (audio.currentTime = Math.min(audio.currentTime + (d.seekOffset || 10), audio.duration)),
        seekto: (d) => (audio.currentTime = d.seekTime)
      };
      for (const [a, fn] of Object.entries(actions)) {
        try { navigator.mediaSession.setActionHandler(a, fn); } catch { }
      }

      // 🕓 Update Position
      const updatePosition = () => {
        if ("setPositionState" in navigator.mediaSession && !isNaN(audio.duration)) {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            position: audio.currentTime,
            playbackRate: audio.playbackRate
          });
        }
      };
      audio.onloadedmetadata = updatePosition;
      audio.ontimeupdate = updatePosition;

      audio.onplay = () => {
        navigator.mediaSession.playbackState = "playing";
        playPauseButton.innerHTML = `<i class='bx bx-pause'></i>`;
      };
      audio.onpause = () => {
        navigator.mediaSession.playbackState = "paused";
        playPauseButton.innerHTML = `<i class='bx bx-play'></i>`;
      };
    }
  }


  function updateButtons() {
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === songs.length - 1;
  }

  function updateTime() {
    const update = () => {
      const { currentTime: ct, duration: dur } = audio;
      timeCompleted.textContent = formatTime(ct);
      timeTotal.textContent = formatTime(dur);
      progress.max = dur;
      progress.value = ct;
    };
    audio.addEventListener('timeupdate', update);
  }

  const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  function seek() { audio.currentTime = progress.value; }
  function changeTime(sec) { audio.currentTime = Math.max(0, Math.min(audio.currentTime + sec, audio.duration)); }

  // ========== NEXT & PREV ==========
  const playNextSong = () => currentIndex < songs.length - 1 && playSong(currentIndex + 1);
  const playPrevSong = () => currentIndex > 0 && playSong(currentIndex - 1);

  // ========== VISUALIZER & HIGHLIGHT ==========
  function updateVisualizers() {
  document.querySelectorAll('.item').forEach(item => {
    const isPlaying = parseInt(item.dataset.index) === currentIndex;
    const viz = item.querySelector('.visualizer');

    viz.classList.toggle('hidden', !isPlaying);

    viz.querySelectorAll('.bar').forEach(b => {
      b.style.animationPlayState = isPlaying ? 'running' : 'paused';
    });
  });
}



  function highlightCurrentSong() {
    document.querySelectorAll('.item').forEach(item => {
      const match = item.querySelector('.song-title').textContent === songTitle.textContent &&
        item.querySelector('.song-artist').textContent === songArtist.textContent;
      item.classList.toggle('bg-gray-700', match);
      item.classList.toggle('border-[1px]', match);
      item.classList.toggle('border-[#29ecfe]', match);
    });
  }

  // ========== EVENT LISTENERS ==========

  playPauseButton.onclick = () => {
    const isPaused = audio.paused;
    isPaused ? audio.play() : audio.pause();
    playPauseButton.innerHTML = `<i class='bx ${isPaused ? 'bx-pause' : 'bx-play'}'></i>`;
    musicplayer.style.animationPlayState = isPaused ? 'running' : 'paused';
  };

  prevButton.onclick = playPrevSong;
  nextButton.onclick = playNextSong;
  forward.onclick = () => changeTime(10);
  rewind.onclick = () => changeTime(-10);
  volumeSlider.oninput = e => audio.volume = e.target.value / 100;
  speedSelect.onchange = e => audio.playbackRate = currentPlaybackRate = parseFloat(e.target.value);
  progress.oninput = seek;

  // const volumeSlider = document.querySelector(".volume-slider");
  const volumeIcon = document.querySelector(".volume-icon");

  let lastVolume = 1; // default full volume

  function updateVolumeUI(volume) {
    volume = Math.round(volume * 100);
    volumeSlider.value = volume;

    volumeIcon.className = 'bx text-2xl'; // reset
    if (volume == 0) volumeIcon.classList.add("bxs-volume-mute");
    else if (volume <= 33) volumeIcon.classList.add("bxs-volume");
    else if (volume <= 66) volumeIcon.classList.add("bxs-volume-low");
    else volumeIcon.classList.add("bxs-volume-full");
  }

  // Slider Input: Update Volume + Icon
  volumeSlider.oninput = e => {
    const vol = e.target.value / 100;
    audio.volume = vol;

    if (vol > 0) lastVolume = vol; // store last volume if not muted
    updateVolumeUI(vol);
  };

  // Volume Icon Click = Toggle Mute/Unmute
  volumeIcon.addEventListener("click", () => {
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
    } else {
      audio.volume = lastVolume || 0.5;
    }
    updateVolumeUI(audio.volume);
  });

  // "M" Key Toggle Mute/Unmute
  document.addEventListener('keydown', e => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

    const actions = {
      KeyN: () => nextButton.click(),
      KeyP: () => prevButton.click(),
      KeyM: () => {
        if (audio.volume > 0) {
          lastVolume = audio.volume;
          audio.volume = 0;
        } else {
          audio.volume = lastVolume || 0.5;
        }
        updateVolumeUI(audio.volume);
      },
      KeyR: () => document.querySelector('.randomSong')?.click(),
      ArrowRight: () => changeTime(10),
      ArrowLeft: () => changeTime(-10),
      Space: () => playPauseButton.click()
    };

    if (actions[e.code]) {
      e.preventDefault();
      actions[e.code]();
    }
  });

  audio.addEventListener('ended', playNextSong);

  // ========== SEARCH ==========
  const searchInput = document.getElementById('search-input');
  const searchNextBtn = document.getElementById('search-next-btn');
  let searchResultIndex = -1;

  searchInput.oninput = () => searchWebsite(false);
  searchNextBtn.onclick = () => searchWebsite(true);

  function searchWebsite(findNext) {
    const term = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll('.item');

    items.forEach(el => {
      el.querySelector('.song-title').style.color = '';
      el.querySelector('.song-artist').style.color = '';
      el.classList.remove('bg-gray-900');
    });

    if (term) {
      for (let i = findNext ? searchResultIndex + 1 : 0; i < items.length; i++) {
        if (items[i].textContent.toLowerCase().includes(term)) {
          searchResultIndex = i;
          highlightElement(items[i]);
          break;
        }
      }
    }
  }

  function highlightElement(el) {
    el.querySelector('.song-title').style.color = 'yellow';
    el.querySelector('.song-artist').style.color = 'yellow';
    el.classList.add('bg-gray-900');
    window.scrollTo({ top: el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2, behavior: 'smooth' });
  }

});