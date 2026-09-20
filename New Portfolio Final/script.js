// Always define logEvent so calls elsewhere never throw, even if
// track.js failed to load or Supabase isn't configured yet.
window.logEvent = window.logEvent || function(){};

// ============================================================
// CUSTOM CIRCULAR CURSOR
// ============================================================
(function(){
  var cursor = document.getElementById("custom-cursor");
  if (!cursor || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  window.addEventListener("mousemove", function(e){
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  });
  document.addEventListener("mouseover", function(e){
    var t = e.target.closest("a, button, input, .zone-card, .work-card, .player-chip, .chai-opt, [data-tab]");
    cursor.classList.toggle("hovering", !!t);
  });
})();

// ============================================================
// STARFIELD — original mechanism: box-shadow-generated dots on
// three fixed layers, pure-CSS upward loop. No JS height math,
// so it can't create the page-growth feedback loop again.
// ============================================================
(function(){
  function generateStars(count, color){
    var shadows = [];
    for (var i = 0; i < count; i++){
      var x = Math.floor(Math.random() * 2000);
      var y = Math.floor(Math.random() * 2000);
      shadows.push(x + "px " + y + "px " + color);
    }
    return shadows.join(", ");
  }
  var styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  var small = generateStars(700, "#5dcaa5");
  var medium = generateStars(200, "#3f8f6d");
  var big = generateStars(100, "#d85a30");
  styleEl.textContent =
    "#stars::before{content:'';position:absolute;width:1px;height:1px;background:transparent;box-shadow:" + small + ";}" +
    "#stars2::before{content:'';position:absolute;width:2px;height:2px;background:transparent;box-shadow:" + medium + ";}" +
    "#stars3::before{content:'';position:absolute;width:3px;height:3px;background:transparent;box-shadow:" + big + ";}";
})();

// ============================================================
// HERO — rotating role text, odometer transition (old slides up
// and out, new slides in from below). The wrapper is measured and
// resized to each role's actual text width, rather than reserving
// one oversized fixed box — that fixed box was the cause of the
// visible gap after "& I'm a".
// ============================================================
(function(){
  var roles = ["AI Product Manager", "AI \u0026 Agents Builder", "0\u21921 Product Shipper"];
  var idx = 0;
  var wrap = document.getElementById("role-wrap");
  var current = document.getElementById("role-slot-a");
  if (!wrap || !current) return;

  function measureWidth(text){
    var probe = document.createElement("span");
    probe.className = "role-slot";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.left = "-9999px";
    probe.textContent = text;
    wrap.appendChild(probe);
    var w = probe.offsetWidth;
    probe.remove();
    return w;
  }
  wrap.style.width = measureWidth(roles[idx]) + "px";

  setInterval(function(){
    idx = (idx + 1) % roles.length;
    wrap.style.width = measureWidth(roles[idx]) + "px";
    var next = document.createElement("span");
    next.className = "role-slot";
    next.textContent = roles[idx];
    next.style.transform = "translateY(100%)";
    next.style.opacity = "0";
    wrap.appendChild(next);
    void next.offsetHeight;
    current.classList.add("transition");
    next.classList.add("transition");
    current.style.transform = "translateY(-100%)";
    current.style.opacity = "0";
    next.style.transform = "translateY(0)";
    next.style.opacity = "1";
    var old = current;
    current = next;
    setTimeout(function(){ old.remove(); }, 520);
  }, 2600);
})();

// ============================================================
// NAVIGATION
// ============================================================
function shuffleArr(arr){
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function gotoPanel(name){
  document.querySelectorAll(".panel").forEach(function(p){p.classList.remove("active");});
  document.getElementById("panel-" + name).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(function(b){
    b.classList.toggle("active", b.dataset.tab === name);
  });
  var tabBar = document.getElementById("tab-bar-wrap");
  tabBar.style.display = (name === "arcade") ? "none" : "flex";
  logEvent("view_section", {section: name});
}

document.querySelectorAll(".tab-btn").forEach(function(btn){
  btn.addEventListener("click", function(){ gotoPanel(btn.dataset.tab); });
});
document.getElementById("game-trigger").addEventListener("click", function(){ gotoPanel("arcade"); });
document.getElementById("arcade-back").addEventListener("click", function(){ gotoPanel("work"); });

function resetHome(){
  gotoPanel("work");
  window.scrollTo({top:0, behavior:"smooth"});
}
document.getElementById("nav-home").addEventListener("click", resetHome);
var logoHomeEl = document.getElementById("logo-home");
if (logoHomeEl) logoHomeEl.addEventListener("click", resetHome);
document.getElementById("nav-about").addEventListener("click", function(){ gotoPanel("about"); });
document.getElementById("nav-contact").addEventListener("click", function(){
  gotoPanel("contact-form");
  window.scrollTo({top:0, behavior:"smooth"});
});

var cfForm = document.getElementById("contact-form");
if (cfForm){
  cfForm.addEventListener("submit", function(e){
    e.preventDefault();
    var name = document.getElementById("cf-name").value.trim();
    var email = document.getElementById("cf-email").value.trim();
    var topic = document.getElementById("cf-topic").value.trim();
    var statusEl = document.getElementById("cf-status");
    if (!name || !email || !topic){
      statusEl.style.color = "#c0392b";
      statusEl.textContent = "Fill in all three fields first.";
      return;
    }
    logEvent("contact_form_submit", {name: name, email: email});
    var subject = encodeURIComponent("Portfolio contact from " + name);
    var body = encodeURIComponent(topic + "\n\n— " + name + " (" + email + ")");
    statusEl.style.color = "var(--ink-faint)";
    statusEl.textContent = "Opening your email client to send this...";
    window.location.href = "mailto:janak.l@somaiya.edu?subject=" + subject + "&body=" + body;
  });
}

// ============================================================
// TRACKER — pure cursor-follow. While the mouse moves over the
// card list, the dot sits at the cursor's height (1:1, no scroll
// math) and the label shows whichever card's vertical range the
// cursor is currently inside.
// ============================================================
function setupTracker(scrollId, dotId, labelId){
  var col = document.getElementById(scrollId);
  var dot = document.getElementById(dotId);
  var label = labelId ? document.getElementById(labelId) : null;
  if (!col || !dot) return;

  col.addEventListener("mousemove", function(e){
    var rect = col.getBoundingClientRect();
    var y = e.clientY - rect.top;
    y = Math.max(0, Math.min(rect.height - 20, y));
    dot.style.top = y + "px";
    if (label){
      label.style.top = (y + 10) + "px";
      var hovered = null;
      col.querySelectorAll("[data-tag]").forEach(function(c){
        var cRect = c.getBoundingClientRect();
        if (e.clientY >= cRect.top && e.clientY <= cRect.bottom) hovered = c;
      });
      if (hovered) label.textContent = hovered.getAttribute("data-tag");
    }
  });
}
setupTracker("work-scroll", "dot-work", null);
setupTracker("scroll-exp", "dot-exp", "label-exp");
setupTracker("scroll-edu", "dot-edu", "label-edu");

// ============================================================
// ARCADE ZONE SWITCHING
// ============================================================
document.querySelectorAll(".zone-card").forEach(function(card){
  card.addEventListener("click", function(){
    document.getElementById("arcade-hub").style.display = "none";
    document.getElementById("zone-" + card.dataset.zone).style.display = "block";
    logEvent("open_game_zone", {zone: card.dataset.zone});
    setTimeout(function(){ initGameParticles(card.dataset.zone); }, 30);
  });
});

document.querySelectorAll(".card-link-arrow, .foot-row").forEach(function(link){
  link.addEventListener("click", function(){
    logEvent("outbound_link_click", {href: link.href, label: (link.textContent||"").trim()});
  });
});
document.querySelectorAll("[data-back='hub']").forEach(function(btn){
  btn.addEventListener("click", function(){
    document.querySelectorAll(".cricket-zone,.movies-zone,.chai-zone,.ai-zone").forEach(function(z){z.style.display="none";});
    document.getElementById("arcade-hub").style.display = "block";
  });
});

// ============================================================
// CRICKET GAME
// ============================================================
var formats = {
  t20: {
    correct: ["Chris Gayle","Vaibhav Suryavanshi","Virat Kohli","AB de Villiers","Jos Buttler","MS Dhoni","Hardik Pandya","Kieron Pollard","Jasprit Bumrah","Sunil Narine","Dale Steyn"],
    decoys: ["Andre Russell","Rashid Khan","Babar Azam","David Warner","Shane Watson","Yuvraj Singh","KL Rahul","Suryakumar Yadav","Trent Boult","Rovman Powell","Nicholas Pooran","Shakib Al Hasan","Faf du Plessis","Quinton de Kock","Shimron Hetmyer","Wanindu Hasaranga","Adam Zampa","Lasith Malinga","Shahid Afridi"]
  },
  odi: {
    correct: ["Rohit Sharma","Sachin Tendulkar","Viv Richards","Virat Kohli","AB de Villiers","Kumar Sangakkara","MS Dhoni","Jacques Kallis","Muttiah Muralitharan","Wasim Akram","Glenn McGrath"],
    decoys: ["Brian Lara","Ricky Ponting","Adam Gilchrist","Inzamam-ul-Haq","Sourav Ganguly","Rahul Dravid","Yuvraj Singh","Herschelle Gibbs","Shahid Afridi","Lasith Malinga","Zaheer Khan","Javed Miandad","Steve Waugh","Aravinda de Silva","Andrew Flintoff","Michael Bevan","Chris Gayle","Shane Warne","Sanath Jayasuriya"]
  },
  test: {
    correct: ["Rahul Dravid","Joe Root","Don Bradman","Virat Kohli","Cheteshwar Pujara","Ben Stokes","Adam Gilchrist","Shane Warne","James Anderson","Jasprit Bumrah","Muttiah Muralitharan"],
    decoys: ["Sachin Tendulkar","Steve Smith","Glenn McGrath","Brian Lara","Ricky Ponting","Sunil Gavaskar","Kumar Sangakkara","Jacques Kallis","Wasim Akram","Curtly Ambrose","Courtney Walsh","Anil Kumble","Graeme Smith","AB de Villiers","Viv Richards","Allan Border","Javed Miandad","Kapil Dev","Ian Botham"]
  }
};
var priorityPlayers = ["Sachin Tendulkar","MS Dhoni","Virat Kohli","Rohit Sharma","Jasprit Bumrah"];
var triviaBank = {
  "Sachin Tendulkar": [
    {q:"How many international centuries did Sachin Tendulkar score across his career?", a:"100"},
    {q:"In what year did Sachin Tendulkar make his international debut?", a:"1989"},
    {q:"What is Sachin Tendulkar's nickname, reflecting his stature in the game?", a:"The Little Master"}
  ],
  "MS Dhoni": [
    {q:"What shot is MS Dhoni famous for finishing the 2011 World Cup final with?", a:"A six over long-on"},
    {q:"What is MS Dhoni's widely used nickname among fans?", a:"Captain Cool"},
    {q:"Which IPL franchise is MS Dhoni most associated with?", a:"Chennai Super Kings"}
  ],
  "Virat Kohli": [
    {q:"How many ODI centuries has Virat Kohli scored, among the most in history?", a:"50+"},
    {q:"What nickname do fans use for Virat Kohli's chase mastery in ODIs?", a:"The Run Machine / Chase Master"},
    {q:"Which IPL franchise has Virat Kohli played for throughout his career?", a:"Royal Challengers Bangalore"}
  ],
  "Rohit Sharma": [
    {q:"How many double centuries has Rohit Sharma scored in ODIs, a world record?", a:"3"},
    {q:"What is Rohit Sharma's highest individual ODI score, the highest ever recorded?", a:"264"},
    {q:"What nickname reflects Rohit Sharma's effortless timing?", a:"The Hitman"}
  ],
  "Jasprit Bumrah": [
    {q:"What is distinctive about Jasprit Bumrah's bowling action?", a:"His unorthodox, slingy action"},
    {q:"Which format has Jasprit Bumrah been ranked world number one bowler in?", a:"Test cricket"},
    {q:"What is Jasprit Bumrah especially known for bowling at the death overs?", a:"Yorkers"}
  ]
};
var xiSelected = [];
var currentFormat = "t20";
var triviaPlayerName = "";

function renderXIList(){
  var list = document.getElementById("xi-list");
  list.innerHTML = "";
  xiSelected.forEach(function(name){
    var row = document.createElement("div");
    row.className = "xi-slot";
    row.innerHTML = "<span>" + name + "</span><span class='remove' data-name='" + name + "'>✕</span>";
    list.appendChild(row);
  });
  document.getElementById("xi-count").textContent = xiSelected.length;
  list.querySelectorAll(".remove").forEach(function(btn){
    btn.addEventListener("click", function(){
      var n = btn.dataset.name;
      xiSelected = xiSelected.filter(function(x){ return x !== n; });
      document.querySelectorAll(".player-chip").forEach(function(c){
        if (c.textContent === n) c.classList.remove("selected");
      });
      renderXIList();
    });
  });
}
function loadFormat(f){
  currentFormat = f;
  xiSelected = [];
  document.getElementById("xi-result").innerHTML = "";
  document.querySelectorAll(".format-btn[data-fmt]").forEach(function(b){
    b.classList.toggle("selected", b.dataset.fmt === f);
  });
  var all = shuffleArr(formats[f].correct.concat(formats[f].decoys));
  var pool = document.getElementById("player-pool");
  pool.innerHTML = "";
  all.forEach(function(name){
    var b = document.createElement("button");
    b.className = "player-chip";
    b.textContent = name;
    b.addEventListener("click", function(){ toggleXI(name, b); });
    pool.appendChild(b);
  });
  renderXIList();
}
function toggleXI(name, btn){
  var i = xiSelected.indexOf(name);
  if (i > -1){ xiSelected.splice(i, 1); btn.classList.remove("selected"); }
  else { if (xiSelected.length >= 11) return; xiSelected.push(name); btn.classList.add("selected"); }
  renderXIList();
}
function submitXI(){
  var resEl = document.getElementById("xi-result");
  if (xiSelected.length < 11){
    resEl.innerHTML = '<div class="cricket-result">Pick 11 players first.</div>';
    return;
  }
  var correct = formats[currentFormat].correct;
  var matched = xiSelected.filter(function(n){ return correct.indexOf(n) > -1; });
  var pct = Math.round(matched.length / 11 * 100);
  var html = "You matched " + matched.length + "/11 (" + pct + "%) with the reference XI.";
  var found = null;
  if (pct >= 80){
    for (var i = 0; i < priorityPlayers.length; i++){
      if (matched.indexOf(priorityPlayers[i]) > -1){ found = priorityPlayers[i]; break; }
    }
    if (found){
      triviaPlayerName = found;
      html += "<br/>You both picked " + found + " — want an optional 3-question trivia round on them?<br/>";
      html += '<button class="format-btn" id="trivia-yes" style="margin-top:8px;">Yes, show trivia</button> ';
      html += '<button class="format-btn" id="trivia-no">No thanks</button><div id="xi-trivia" style="margin-top:8px;"></div>';
    }
  }
  resEl.innerHTML = '<div class="cricket-result">' + html + "</div>";
  if (found){
    document.getElementById("trivia-yes").addEventListener("click", function(){
      var qs = triviaBank[triviaPlayerName] || [];
      var html2 = qs.map(function(item, i){
        return "<p style='margin-bottom:8px;'><strong>Q" + (i+1) + ".</strong> " + item.q + "<br/><em>" + item.a + "</em></p>";
      }).join("");
      document.getElementById("xi-trivia").innerHTML = html2;
    });
    document.getElementById("trivia-no").addEventListener("click", function(){
      document.getElementById("xi-trivia").innerHTML = "";
    });
  }
}
document.querySelectorAll(".format-btn[data-fmt]").forEach(function(b){
  b.addEventListener("click", function(){ loadFormat(b.dataset.fmt); logEvent("cricket_format_select", {format: b.dataset.fmt}); });
});
document.getElementById("submit-xi").addEventListener("click", function(){
  submitXI();
  var correct = formats[currentFormat].correct;
  var matched = xiSelected.filter(function(n){ return correct.indexOf(n) > -1; }).length;
  logEvent("cricket_submit_xi", {format: currentFormat, matched: matched});
});
loadFormat("t20");

// ============================================================
// MOVIES GAME
// ============================================================
// Poster images: drop files in assets/posters/ named after the title.
// Matching is forgiving — case, spaces vs hyphens vs underscores, and
// "&" vs "and" are all treated as equivalent, and both .jpg and .png
// are tried. So "Dilwale Dulhania Le Jayenge" matches any of
// dilwale-dulhania-le-jayenge.jpg, Dilwale_Dulhania_Le_Jayenge.JPG,
// "Dilwale Dulhania Le Jayenge.png", etc. Missing files just don't
// render (title guessing still works).
function normalizeKey(s){
  return s.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
function posterCandidates(title){
  var base = title.trim();
  var hyphenSpace = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  var hyphenAnd = base.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  var hyphenAmp = base.toLowerCase().replace(/\band\b/g, "&").replace(/[^a-z0-9&]+/g, "-").replace(/(^-|-$)/g, "");
  var underscore = hyphenSpace.replace(/-/g, "_");
  var rawSpaces = base.replace(/[!?.,'"]/g, "");
  var variants = [hyphenSpace, hyphenAnd, hyphenAmp, underscore, rawSpaces, base];
  var seen = {}; var out = [];
  variants.forEach(function(v){
    if (!v || seen[v]) return;
    seen[v] = true;
    out.push("assets/posters/" + v + ".jpg");
    out.push("assets/posters/" + v + ".png");
  });
  return out;
}
var movieCats = {
  indian: ["Kagaz Ke Phool","The Lunchbox","Dhurandhar","Andaz Apna Apna","Taare Zameen Par","Bombay","Barfi!","Dilwale Dulhania Le Jayenge","Rang De Basanti","Lagaan","Laalo","Lokah Chapter 1 Chandra","777 Charlie","Animal","KGF","Baahubali","Bajrangi Bhaijaan","Pather Panchali","Swades","Amar Akbar Anthony","Sholay","Mother India","Deewaar","3 Idiots","96"].map(function(t){ return {title:t}; }),
  western: ["The Lion King","Dead Poets Society","The Notebook","The Pursuit of Happyness","Fight Club","Eternal Sunshine of the Spotless Mind","The Godfather","Shutter Island","La La Land","Titanic","Stranger Things","Interstellar","The Prestige","Suits","Breaking Bad","Money Heist","The Odyssey"].map(function(t){ return {title:t}; })
};
var TILE_COUNT = 16;
function newRevealSteps(){
  var order = shuffleArr(Array.from({length: TILE_COUNT}, function(_, i){ return i; }));
  var steps = new Array(TILE_COUNT);
  order.forEach(function(tileIdx, step){ steps[tileIdx] = step; });
  return steps;
}
var movieState = { cat: "indian", idx: 0, tilesLeft: TILE_COUNT, refreshesLeft: 3, revealSteps: newRevealSteps() };
function renderPoster(){
  var img = document.getElementById("poster-img");
  var candidates = posterCandidates(movieCats[movieState.cat][movieState.idx].title);
  var ci = 0;
  function tryNext(){
    if (ci >= candidates.length){ img.style.display = "none"; return; }
    img.src = candidates[ci++];
  }
  img.onerror = tryNext;
  img.onload = function(){ img.style.display = "block"; };
  tryNext();
  var overlay = document.getElementById("tile-overlay");
  overlay.innerHTML = "";
  var revealedCount = TILE_COUNT - movieState.tilesLeft;
  for (var i = 0; i < TILE_COUNT; i++){
    var t = document.createElement("div");
    var isRevealed = movieState.revealSteps[i] < revealedCount;
    t.className = "poster-tile" + (isRevealed ? " revealed" : "");
    overlay.appendChild(t);
  }
  document.getElementById("tiles-left").textContent = movieState.tilesLeft;
  document.getElementById("refreshes-left").textContent = movieState.refreshesLeft;
}
function randomMovieIdx(cat, excludeIdx){
  var len = movieCats[cat].length;
  if (len <= 1) return 0;
  var idx;
  do { idx = Math.floor(Math.random() * len); } while (idx === excludeIdx);
  return idx;
}
function loadMovieCategory(cat){
  movieState = { cat: cat, idx: randomMovieIdx(cat, -1), tilesLeft: TILE_COUNT, refreshesLeft: 3, revealSteps: newRevealSteps() };
  document.getElementById("movie-result").textContent = "";
  document.querySelectorAll(".movie-cat-btn").forEach(function(b){
    b.classList.toggle("selected", b.dataset.mcat === cat);
  });
  renderPoster();
  logEvent("movie_category_select", {category: cat});
}
function normalize(s){ return normalizeKey(s); }
function nextRandomMovie(){
  movieState.idx = randomMovieIdx(movieState.cat, movieState.idx);
  movieState.tilesLeft = TILE_COUNT;
  movieState.refreshesLeft = 3;
  movieState.revealSteps = newRevealSteps();
  document.getElementById("movie-result").textContent = "";
  document.getElementById("movie-guess").value = "";
  renderPoster();
}
function guessMovie(){
  var val = document.getElementById("movie-guess").value.trim();
  var resEl = document.getElementById("movie-result");
  if (!val){ resEl.textContent = "Type a guess first."; return; }
  var answer = movieCats[movieState.cat][movieState.idx].title;
  var isCorrect = normalize(val) === normalize(answer);
  logEvent("movie_guess", {category: movieState.cat, title: answer, correct: isCorrect});
  if (isCorrect){
    resEl.textContent = "Correct — it was " + answer + ". Next one...";
    movieState.tilesLeft = 0;
    renderPoster();
    setTimeout(nextRandomMovie, 1300);
  } else {
    movieState.tilesLeft = Math.max(0, movieState.tilesLeft - 1);
    resEl.textContent = "Not quite — one more tile revealed.";
    renderPoster();
  }
}
function refreshMovie(){
  if (movieState.refreshesLeft <= 0) return;
  movieState.refreshesLeft--;
  movieState.idx = randomMovieIdx(movieState.cat, movieState.idx);
  movieState.tilesLeft = TILE_COUNT;
  movieState.revealSteps = newRevealSteps();
  document.getElementById("movie-result").textContent = "";
  renderPoster();
  logEvent("movie_refresh", {category: movieState.cat});
}
document.querySelectorAll(".movie-cat-btn").forEach(function(b){
  b.addEventListener("click", function(){ loadMovieCategory(b.dataset.mcat); });
});
document.getElementById("guess-btn").addEventListener("click", guessMovie);
document.getElementById("refresh-btn").addEventListener("click", refreshMovie);
loadMovieCategory("indian");

// ============================================================
// CHAI / GHAZAL GAME
// ============================================================
var indianSongsPool = [
  {title:"Jaane Woh Kaise Log The", clue:"A classic wondering aloud where those people from the old days disappeared to.", bucket:"old", lyric:""},
  {title:"Lag Ja Gale", clue:"A classic asking for one more embrace, since who knows about tomorrow.", bucket:"old", lyric:""},
  {title:"Pal Pal Dil Ke Paas", clue:"A classic about someone staying close to the heart, moment to moment.", bucket:"old", lyric:""},
  {title:"Channa Mereya", clue:"Arijit Singh, from a film about a painter falling for his college crush, named after a tree.", bucket:"arijit", lyric:""},
  {title:"Tum Hi Ho", clue:"Arijit Singh, the core romantic theme about being everything to someone.", bucket:"arijit", lyric:""},
  {title:"Kesariya", clue:"Arijit Singh, a saffron-toned love song from a big multi-starrer romance.", bucket:"arijit", lyric:""},
  {title:"Phir Mohabbat", clue:"Arijit Singh, on falling in love again despite having been hurt before.", bucket:"arijit", lyric:""},
  {title:"Tere Hawale", clue:"A duet about handing yourself over completely to someone else, from a spy-thriller franchise film.", bucket:"shreya", lyric:""},
  {title:"O Rangrez", clue:"Shreya Ghoshal, comparing a lover to a dyer who colors everything they touch.", bucket:"shreya", lyric:""},
  {title:"Ghar More Pardesiya", clue:"Shreya Ghoshal, a classical-style number about leaving behind a childhood home.", bucket:"shreya", lyric:""},
  {title:"Dhoom Taana", clue:"Shreya Ghoshal, a big retro-styled dance number from a reincarnation love story.", bucket:"shreya", lyric:""},
  {title:"Ye Jo Des Hai Mera", clue:"An A R Rahman patriotic number about deep pride in your homeland.", bucket:"other", lyric:""},
  {title:"Chaiyya Chaiyya", clue:"An A R Rahman song famously picturized atop a moving train.", bucket:"other", lyric:""},
  {title:"Kaise Hua", clue:"Vishal Mishra, on wondering how falling in love happened so suddenly.", bucket:"other", lyric:""}
];
var ghazalPool = [
  {title:"Chupke Chupke", clue:"Ghulam Ali, on meeting someone quietly, away from prying eyes.", bucket:"g", lyric:""},
  {title:"Awargi", clue:"Ghulam Ali, on a restless, wandering state of being.", bucket:"g", lyric:""},
  {title:"Sason Ki Mala Pe", clue:"A ghazal comparing counting breaths to counting prayer beads while remembering someone dear.", bucket:"g", lyric:""},
  {title:"Woh Bhi Apne Na Huye", clue:"A ghazal mourning someone who never truly became your own.", bucket:"g", lyric:""},
  {title:"Kal Chaudhvi Ki Raat Thi", clue:"Jagjit Singh, describing a moonlit fourteenth night.", bucket:"g", lyric:""},
  {title:"Hoshwaalon Ko Khabar Kya", clue:"Jagjit Singh, on how only the intoxicated truly understand a certain state of being.", bucket:"g", lyric:""},
  {title:"Tum Itna Jo Muskura Rahe Ho", clue:"Jagjit Singh, questioning a smile that seems to be hiding some sadness.", bucket:"g", lyric:""}
];
var ingredients = ["water","chai patti","elaichi and ginger","sugar","milk"];
var pourColors = {"water":"#bcdff5","chai patti":"#6b4423","elaichi and ginger":"#6fae55","sugar":"#ffffff","milk":"#f3ead6"};
var chaiFlags = {};
var chaiIdx = 0, chaiCategory = "indian", chaiSession = [], chaiUsedTitles = [];

function colorFor(flags){
  var cp = flags["chai patti"], mk = flags["milk"], wt = flags["water"];
  var base;
  if (cp && mk) base = "#c98a4b";
  else if (cp && !mk) base = "#5a2f12";
  else if (!cp && mk) base = "#f6efe0";
  else base = "#dff1fb";
  if (!wt && (cp || mk)){
    if (base === "#c98a4b") base = "#a86f3a";
    else if (base === "#5a2f12") base = "#3d1f0c";
    else if (base === "#f6efe0") base = "#efe4cf";
  }
  return base;
}
function setWisp(on){
  ["wisp1","wisp2"].forEach(function(id){
    document.getElementById(id).className = on ? "wisp2 on" : "wisp2";
  });
}
function pickWrongs(pool, correctTitle, used, need){
  var strict = pool.filter(function(s){ return s.title !== correctTitle && used.indexOf(s.title) === -1; });
  var chosen = shuffleArr(strict).slice(0, need).map(function(s){ return s.title; });
  if (chosen.length < need){
    var fallback = pool.filter(function(s){ return s.title !== correctTitle && chosen.indexOf(s.title) === -1; });
    var extra = shuffleArr(fallback).slice(0, need - chosen.length).map(function(s){ return s.title; });
    chosen = chosen.concat(extra);
  }
  return chosen;
}
function startChai(cat){
  chaiCategory = cat;
  logEvent("chai_category_select", {category: cat});
  document.querySelectorAll(".chai-cat-btn").forEach(function(b){
    b.classList.toggle("selected", b.dataset.ccat === cat);
  });
  chaiIdx = 0; chaiFlags = {}; chaiUsedTitles = [];
  document.getElementById("liquid").style.height = "0%";
  document.getElementById("liquid").style.background = "#dff1fb";
  setWisp(false);
  document.getElementById("shimmer1").className = "shimmer2";
  document.getElementById("shimmer2").className = "shimmer2";
  document.getElementById("chai-end").innerHTML = "";
  if (cat === "ghazal"){
    chaiSession = shuffleArr(ghazalPool).slice(0, 5);
  } else {
    var oldArr = shuffleArr(indianSongsPool.filter(function(s){ return s.bucket === "old"; }));
    var arijitArr = shuffleArr(indianSongsPool.filter(function(s){ return s.bucket === "arijit"; }));
    var shreyaArr = shuffleArr(indianSongsPool.filter(function(s){ return s.bucket === "shreya"; }));
    var picked = [oldArr[0], arijitArr[0], shreyaArr[0]];
    var rest = indianSongsPool.filter(function(s){ return picked.indexOf(s) === -1; });
    var others = shuffleArr(rest).slice(0, 2);
    chaiSession = shuffleArr(picked.concat(others));
  }
  renderChaiQ();
}
function renderChaiQ(){
  if (chaiIdx >= 5){ finishChai(); return; }
  var q = chaiSession[chaiIdx];
  // Paste a short (fair-use) lyric line into each song's `lyric` field above
  // to show the real lyric here instead of the written clue — falls back
  // to the clue automatically for any song you haven't filled in yet.
  document.getElementById("clue2").textContent = q.lyric ? q.lyric : q.clue;
  var pool = chaiCategory === "ghazal" ? ghazalPool : indianSongsPool;
  var wrongs = pickWrongs(pool, q.title, chaiUsedTitles, 2);
  var opts = shuffleArr([q.title].concat(wrongs));
  var correctIdx = opts.indexOf(q.title);
  chaiUsedTitles = chaiUsedTitles.concat(opts.filter(function(t){ return chaiUsedTitles.indexOf(t) === -1; }));
  var box = document.getElementById("opts2");
  box.innerHTML = "";
  opts.forEach(function(opt, i){
    var b = document.createElement("button");
    b.className = "chai-opt";
    b.textContent = opt;
    b.addEventListener("click", function(){ answerChai(i === correctIdx); });
    box.appendChild(b);
  });
}
function answerChai(isCorrect){
  logEvent("chai_answer", {ingredient: ingredients[chaiIdx], correct: isCorrect, category: chaiCategory});
  var ing = ingredients[chaiIdx];
  chaiFlags[ing] = isCorrect;
  var pourColor = isCorrect ? pourColors[ing] : "#c9c2b4";
  var p = document.createElement("div");
  p.className = "pour2 animate";
  p.style.background = pourColor;
  document.querySelector(".glass2").appendChild(p);
  setTimeout(function(){ p.remove(); }, 650);
  setTimeout(function(){
    document.getElementById("liquid").style.height = ((chaiIdx + 1) * 20) + "%";
    document.getElementById("liquid").style.background = colorFor(chaiFlags);
    chaiIdx++;
    renderChaiQ();
  }, 600);
}
function finishChai(){
  logEvent("chai_finished", {category: chaiCategory, flags: chaiFlags});
  document.getElementById("clue2").textContent = "";
  document.getElementById("opts2").innerHTML = "";
  var perfect = chaiFlags["water"] && chaiFlags["chai patti"] && chaiFlags["elaichi and ginger"] && chaiFlags["sugar"] && chaiFlags["milk"];
  setWisp(!!chaiFlags["elaichi and ginger"]);
  if (chaiFlags["sugar"]){
    document.getElementById("shimmer1").className = "shimmer2 on";
    document.getElementById("shimmer2").className = "shimmer2 on";
  }
  var correctCount = Object.values(chaiFlags).filter(Boolean).length;
  var desc = perfect
    ? "A perfect Mumbai cutting chai — rich, well-brewed, and steaming."
    : (correctCount + "/5 correct — a chai with a few missing notes today.");
  document.getElementById("chai-end").innerHTML =
    '<div class="cricket-result" style="background:#fffaf1;color:#4a3520;">' +
    "<p style=\"font-weight:600;margin-bottom:10px;\">" + desc + "</p>" +
    '<div style="display:flex;align-items:center;gap:16px;">' +
      '<div class="vinyl2" id="vinyl3">' +
        '<div class="groove2" style="width:74px;height:74px;"></div>' +
        '<div class="groove2" style="width:58px;height:58px;"></div>' +
        '<div class="groove2" style="width:42px;height:42px;"></div>' +
        '<div class="label2"></div>' +
        '<div class="tonearm2" id="tonearm3"></div>' +
      '</div>' +
      '<div><p style="font-weight:600;">Hum Tere Pyaar Mein</p><p style="font-size:0.85rem;color:#8a6a45;">Lata Mangeshkar</p></div>' +
    '</div>' +
    '<button class="chai-cat-btn selected" id="brew-again" style="margin-top:14px;">Brew again</button></div>';
  setTimeout(function(){
    document.getElementById("vinyl3").classList.add("spin");
    document.getElementById("tonearm3").classList.add("down");
  }, 200);
  document.getElementById("brew-again").addEventListener("click", function(){ startChai(chaiCategory); });
}
document.querySelectorAll(".chai-cat-btn[data-ccat]").forEach(function(b){
  b.addEventListener("click", function(){ startChai(b.dataset.ccat); });
});
startChai("indian");

// ============================================================
// AI / TECH RUNNER
// ============================================================
var aiRegular = [
  {q:"Who founded OpenAI, as co-founder and CEO?", correct:"Sam Altman", wrong:["Elon Musk","Larry Page"]},
  {q:"Who is the current CEO of Apple?", correct:"John Ternus", wrong:["Tim Cook","Steve Jobs"]},
  {q:"Who is the current CEO of Google or Alphabet?", correct:"Sundar Pichai", wrong:["Sergey Brin","Bill Gates"]},
  {q:"Who is the current CEO of Microsoft?", correct:"Satya Nadella", wrong:["Steve Ballmer","Bill Gates"]},
  {q:"Who co-founded Meta alongside Zuckerberg?", correct:"Dustin Moskovitz", wrong:["Jack Dorsey","Reid Hoffman"]},
  {q:"Where was the term Artificial Intelligence first coined?", correct:"Dartmouth College, 1956", wrong:["MIT","Stanford"]},
  {q:"Who coined the term Artificial Intelligence?", correct:"John McCarthy", wrong:["Alan Turing","Marvin Minsky"]},
  {q:"Who founded Anthropic?", correct:"Dario Amodei", wrong:["Daniela Amodei","Elon Musk"]},
  {q:"What does MCP stand for?", correct:"Model Context Protocol", wrong:["Machine Control Protocol","Multi-Channel Processing"]},
  {q:"Automating repetitive tasks with scripts acting on real data is called what?", correct:"Agents", wrong:["Bots","Pipelines"]},
  {q:"What is the smallest unit of measure for AI text processing?", correct:"Token", wrong:["Byte","Parameter"]},
  {q:"What does LLM stand for?", correct:"Large Language Model", wrong:["Long Language Machine","Linear Learning Model"]},
  {q:"What does GPT stand for?", correct:"Generative Pre-trained Transformer", wrong:["General Purpose Technology","Guided Prediction Tool"]},
  {q:"What does RAG stand for in AI?", correct:"Retrieval-Augmented Generation", wrong:["Random Access Generation","Recursive AI Gateway"]},
  {q:"Which company published the Attention Is All You Need paper?", correct:"Google", wrong:["OpenAI","Meta"]},
  {q:"What test did Alan Turing propose to measure machine intelligence?", correct:"The Turing Test", wrong:["The Logic Test","The Mimicry Trial"]},
  {q:"What is it called when an AI confidently generates false information?", correct:"Hallucination", wrong:["Glitch","Bias"]},
  {q:"Who is the CEO of Nvidia?", correct:"Jensen Huang", wrong:["Lisa Su","Satya Nadella"]},
  {q:"What does AGI stand for?", correct:"Artificial General Intelligence", wrong:["Advanced Generative Interface","Automated General Intelligence"]},
  {q:"Which lab created AlphaGo?", correct:"DeepMind", wrong:["OpenAI","xAI"]},
  {q:"What is Anthropic's AI assistant called?", correct:"Claude", wrong:["Bard","Cortana"]},
  {q:"What is Google's AI model family called?", correct:"Gemini", wrong:["Llama","Watson"]},
  {q:"What is Microsoft's AI assistant called?", correct:"Copilot", wrong:["Siri","Alexa"]},
  {q:"Teaching a model via examples in the prompt, with no weight updates, is called what?", correct:"Few-shot prompting", wrong:["Fine-tuning","Pretraining"]},
  {q:"Which company developed the TPU AI chip?", correct:"Google", wrong:["Nvidia","Intel"]},
  {q:"What parameter controls randomness in AI text output?", correct:"Temperature", wrong:["Entropy","Threshold"]},
  {q:"Who is commonly called the Godfather of AI?", correct:"Geoffrey Hinton", wrong:["Yann LeCun","Yoshua Bengio"]},
  {q:"What is Meta's open-weight model family called?", correct:"Llama", wrong:["Mistral","DeepSeek"]},
  {q:"Which company dominates the GPU market for AI training?", correct:"Nvidia", wrong:["Intel","AMD"]},
  {q:"What are the GPU-and-server facilities that power AI training called?", correct:"Data centers", wrong:["Content delivery networks","Edge devices"]}
];
var aiHard = [
  {q:"Who invented the perceptron in 1958?", correct:"Frank Rosenblatt", wrong:["Marvin Minsky","Warren McCulloch"]},
  {q:"What technique did the Towards Monosemanticity paper use to decompose neuron activations?", correct:"Sparse autoencoders", wrong:["Attention rollout","Layer-wise relevance propagation"]},
  {q:"What was the model dimension of the base Transformer in the original 2017 paper?", correct:"512", wrong:["768","1024"]},
  {q:"Anthropic's Constitutional AI replaced human labels with AI-generated ones. What is this called?", correct:"RLAIF", wrong:["RLHF","DPO"]},
  {q:"Who authored the seminal 1986 paper that popularized backpropagation?", correct:"Rumelhart, Hinton, and Williams", wrong:["LeCun, Bengio, and Schmidhuber","Minsky, Papert, and McCulloch"]}
];

function laneX(lane, p){
  var topL = 35, topR = 65, botL = 0, botR = 100;
  var le = topL + (botL - topL) * p;
  var re = topR + (botR - topR) * p;
  var frac = (lane + 0.5) / 3;
  return le + frac * (re - le);
}
function depthY(p){ return 8 + p * 76; }
function depthScale(p){ return 0.55 + p * 0.95; }

var TOTAL_PLANNED = 35;
var aiSequence = [], aiState = null, hardCorrectCount = 0;

function buildSequence(){
  var reg = shuffleArr(aiRegular);
  var hard = shuffleArr(aiHard);
  var seq = reg.slice(0, 20).map(function(q){ return {q:q, hard:false}; });
  var restReg = reg.slice(20);
  for (var i = 0; i < 5; i++){
    seq.push({q:hard[i], hard:true});
    if (restReg[i]) seq.push({q:restReg[i], hard:false});
  }
  return seq;
}
function timeLimitFor(qNum){
  if (qNum <= 2) return 15;
  if (qNum <= 5) return 14;
  if (qNum <= 7) return 13;
  if (qNum <= 9) return 12;
  if (aiState.dynamicLimit === undefined) aiState.dynamicLimit = 11;
  return Math.max(5, aiState.dynamicLimit);
}
function renderHearts(){
  var box = document.getElementById("hearts");
  box.innerHTML = "";
  for (var i = 0; i < 2; i++){
    var alive = i < aiState.lives;
    box.innerHTML += '<i class="fa-solid fa-heart" style="color:' + (alive ? "#ff4d6d" : "#233a2c") + ';"></i>';
  }
}
function clearGates(){ ["h0","h1","h2"].forEach(function(id){ var el = document.getElementById(id); if (el) el.remove(); }); }
function positionRunner(lane){ document.getElementById("signal3").style.left = laneX(lane, 1) + "%"; }

function startAI(jumpToHard){
  logEvent("ai_game_start", {});
  aiSequence = buildSequence();
  aiState = {idx: jumpToHard ? 20 : 0, lives:2, tickTimer:null, elapsed:0, lane:1, dynamicLimit:undefined};
  hardCorrectCount = 0;
  document.getElementById("end3").innerHTML = "";
  document.getElementById("q-note3").textContent = "";
  document.getElementById("q-text3").textContent = "";
  renderHearts();
  positionRunner(1);
  document.getElementById("getready3").style.display = "none";
  renderAIQ();
}
function currentItem(){ return aiSequence[aiState.idx]; }
function renderAIQ(){
  clearInterval(aiState.tickTimer);
  clearGates();
  aiState.elapsed = 0;
  document.getElementById("q-note3").textContent = "";
  var item = currentItem();
  var qNum = aiState.idx + 1;
  var limitSec = timeLimitFor(qNum);
  var limitMs = limitSec * 1000;
  document.getElementById("q-idx").textContent = qNum + (item.hard ? "h" : "");
  document.getElementById("q-text3").textContent = item.q.q;
  var opts = shuffleArr([item.q.correct].concat(item.q.wrong));
  var correctIdx = opts.indexOf(item.q.correct);
  var scene = document.getElementById("scene3");
  opts.forEach(function(text, lane){
    var g = document.createElement("div");
    g.className = "gate-arch2";
    g.id = "h" + lane;
    g.textContent = text;
    g.addEventListener("click", function(){ resolveAnswer(lane, lane === correctIdx, item.hard); });
    scene.appendChild(g);
  });
  document.getElementById("trace-node").style.left = Math.min(96, (aiState.idx / TOTAL_PLANNED) * 100) + "%";
  document.getElementById("trace-node").style.background = item.hard ? "#ff4d6d" : "#3cffa0";
  document.getElementById("q-timer").textContent = limitSec;
  aiState.tickTimer = setInterval(function(){
    aiState.elapsed += 100;
    var p = Math.min(1, aiState.elapsed / limitMs);
    [0,1,2].forEach(function(lane){
      var g = document.getElementById("h" + lane);
      if (g){
        g.style.left = laneX(lane, p) + "%";
        g.style.top = depthY(p) + "%";
        g.style.transform = "translate(-50%,-50%) scale(" + depthScale(p) + ")";
      }
    });
    document.getElementById("q-timer").textContent = Math.max(0, Math.ceil((limitMs - aiState.elapsed) / 1000));
    if (aiState.elapsed >= limitMs){
      clearInterval(aiState.tickTimer);
      var correctByDefault = (aiState.lane === correctIdx);
      document.getElementById("q-note3").textContent = "No selection — ran straight through lane " + (aiState.lane + 1) + ".";
      resolveAnswer(aiState.lane, correctByDefault, item.hard, true);
    }
  }, 100);
}
function resolveAnswer(lane, isCorrect, isHard, isTimeout){
  logEvent("ai_answer", {questionIdx: aiState.idx, correct: isCorrect, hard: !!isHard, timeout: !!isTimeout});
  clearInterval(aiState.tickTimer);
  var runner = document.getElementById("signal3");
  if (!isTimeout){ aiState.lane = lane; positionRunner(lane); }
  var g = document.getElementById("h" + lane);
  if (isCorrect){
    if (g) g.classList.add("pass");
    runner.classList.add("pass-anim");
    setTimeout(function(){ runner.classList.remove("pass-anim"); }, 400);
    if (aiState.dynamicLimit !== undefined) aiState.dynamicLimit = Math.max(5, aiState.dynamicLimit - 1);
    advance(true, isHard);
  } else {
    if (g) g.classList.add("fail");
    runner.classList.add("fail-anim");
    setTimeout(function(){ runner.classList.remove("fail-anim"); }, 650);
    aiState.lives--;
    renderHearts();
    if (aiState.lives <= 0){ endGame(aiState.idx >= 20); return; }
    advance(false, isHard, true);
  }
}
function advance(wasCorrect, wasHard, delay){
  if (wasHard && wasCorrect) hardCorrectCount++;
  if (hardCorrectCount >= 5){ setTimeout(winGame, 650); return; }
  aiState.idx++;
  if (aiState.idx >= aiSequence.length){
    setTimeout(function(){ document.getElementById("q-text3").textContent = "Run complete."; }, 650);
    return;
  }
  setTimeout(renderAIQ, delay ? 750 : 420);
}
function endGame(pastTwenty){
  logEvent("ai_game_over", {questionsCleared: aiState.idx, hardCorrect: hardCorrectCount, pastTwenty: pastTwenty});
  clearGates();
  var tier = pastTwenty ? "SIGNAL SURVIVOR" : "CONNECTION LOST";
  document.getElementById("q-text3").textContent = "";
  document.getElementById("q-note3").textContent = "";
  document.getElementById("end3").innerHTML =
    '<div class="console2"><p style="color:' + (pastTwenty ? "#ffd166" : "#ff4d6d") + ';font-size:1.3rem;font-weight:600;letter-spacing:1px;margin-bottom:8px;">' + tier + '</p>' +
    '<p style="margin-bottom:4px;">questions cleared: ' + aiState.idx + '</p>' +
    '<p style="margin-bottom:16px;">hard questions correct: ' + hardCorrectCount + '/5</p>' +
    '<button class="chai-cat-btn selected" id="restart3">run it back</button></div>';
  document.getElementById("restart3").addEventListener("click", function(){ startAI(false); });
}
function winGame(){
  logEvent("ai_game_win", {hardCorrect: hardCorrectCount});
  clearGates();
  document.getElementById("q-text3").textContent = "";
  document.getElementById("q-note3").textContent = "";
  document.getElementById("end3").innerHTML =
    '<div class="console2"><p style="color:#3cffa0;font-size:1.3rem;font-weight:600;letter-spacing:1px;margin-bottom:8px;">SIGNAL COMPLETE</p>' +
    '<p style="margin-bottom:16px;">All 5 hard questions cleared — you are the winner.</p>' +
    '<button class="chai-cat-btn selected" id="restart3">run it back</button></div>';
  document.getElementById("restart3").addEventListener("click", function(){ startAI(false); });
}
document.getElementById("ai-start-btn").addEventListener("click", function(){ startAI(false); });

// ============================================================
// HERO SWIRL — Three.js fullscreen shader: vortex distortion +
// ordered-dither pixelation between the two theme colors.
// ============================================================
(function(){
  if (!window.THREE) return;
  var canvas = document.getElementById("hero-swirl");
  var wrap = canvas ? canvas.parentElement : null;
  if (!canvas || !wrap) return;

  function hexToVec3(hex){
    hex = hex.trim().replace("#", "");
    var r = parseInt(hex.substring(0,2),16)/255;
    var g = parseInt(hex.substring(2,4),16)/255;
    var b = parseInt(hex.substring(4,6),16)/255;
    return new THREE.Vector3(r,g,b);
  }
  function themeColors(){
    var cs = getComputedStyle(document.documentElement);
    return {
      back: hexToVec3(cs.getPropertyValue("--parchment") || "#f3faf3"),
      front: hexToVec3(cs.getPropertyValue("--coral") || "#d85a30")
    };
  }

  var renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: false});
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  var geo = new THREE.PlaneGeometry(2,2);
  var colors = themeColors();
  var uniforms = {
    uTime: {value: 0},
    uResolution: {value: new THREE.Vector2(1,1)},
    uColorBack: {value: colors.back},
    uColorFront: {value: colors.front},
    uPxSize: {value: 4.0}
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }",
    fragmentShader:
      "precision mediump float;" +
      "varying vec2 vUv;" +
      "uniform float uTime; uniform vec2 uResolution; uniform vec3 uColorBack; uniform vec3 uColorFront; uniform float uPxSize;" +
      "float bayer4x4(vec2 p){" +
        "int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0));" +
        "float m[16];" +
        "m[0]=0.0;m[1]=8.0;m[2]=2.0;m[3]=10.0;" +
        "m[4]=12.0;m[5]=4.0;m[6]=14.0;m[7]=6.0;" +
        "m[8]=3.0;m[9]=11.0;m[10]=1.0;m[11]=9.0;" +
        "m[12]=15.0;m[13]=7.0;m[14]=13.0;m[15]=5.0;" +
        "return m[y*4+x]/16.0;" +
      "}" +
      "void main(){" +
        "vec2 res = uResolution;" +
        "vec2 pixelUv = floor(vUv*res/uPxSize)*uPxSize;" +
        "vec2 uv = (pixelUv/res) - 0.5;" +
        "uv.x *= res.x/res.y;" +
        "float radius = length(uv);" +
        "float angle = atan(uv.y,uv.x);" +
        "angle += uTime*0.35 + radius*6.0 - sin(radius*8.0 - uTime*0.8)*0.6;" +
        "vec2 suv = vec2(cos(angle),sin(angle))*radius;" +
        "float val = 0.5 + 0.5*sin(suv.x*6.0 + suv.y*6.0 - uTime*0.6);" +
        "val = smoothstep(0.15,0.85,val);" +
        "float thresh = bayer4x4(pixelUv/uPxSize);" +
        "float mixv = step(thresh, val);" +
        "vec3 col = mix(uColorBack, uColorFront, mixv*0.85);" +
        "float vign = 1.0 - smoothstep(0.35,0.75,radius);" +
        "gl_FragColor = vec4(col, 0.16*vign);" +
      "}"
  });
  var mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  function resize(){
    var w = wrap.clientWidth || 300;
    var h = wrap.clientHeight || 200;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  }
  resize();
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);

  var clock = new THREE.Clock();
  function animate(){
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

// ============================================================
// GAME AMBIENT PARTICLES — PixiJS, lazy-initialized the first
// time each arcade zone is opened (canvases start at 0 size
// while their zone is display:none, so init happens on demand).
// ============================================================
var particleInit = {};
function ambientParticles(canvasId, color, count, dir){
  var canvas = document.getElementById(canvasId);
  if (!canvas || !window.PIXI) return null;
  var parent = canvas.parentElement;
  var app = new PIXI.Application({view: canvas, resizeTo: parent, backgroundAlpha: 0, antialias: true});
  var particles = [];
  for (var i = 0; i < count; i++){
    var g = new PIXI.Graphics();
    var r = 1 + Math.random()*2;
    g.beginFill(color, 0.4 + Math.random()*0.4);
    g.drawCircle(0,0,r);
    g.endFill();
    g.x = Math.random()*app.screen.width;
    g.y = Math.random()*app.screen.height;
    g.vy = dir*(0.15 + Math.random()*0.4);
    g.vx = (Math.random()-0.5)*0.12;
    app.stage.addChild(g);
    particles.push(g);
  }
  app.ticker.add(function(){
    var w = app.screen.width, h = app.screen.height;
    particles.forEach(function(p){
      p.y += p.vy; p.x += p.vx;
      if (dir < 0 && p.y < -5){ p.y = h+5; p.x = Math.random()*w; }
      if (dir > 0 && p.y > h+5){ p.y = -5; p.x = Math.random()*w; }
    });
  });
  return app;
}
function initGameParticles(zone){
  if (particleInit[zone]) return;
  particleInit[zone] = true;
  if (zone === "cricket") ambientParticles("particles-cricket", 0xfff3c9, 34, -1);
  if (zone === "movies") ambientParticles("particles-cinema", 0xffffff, 24, -1);
  if (zone === "chai") ambientParticles("particles-chai", 0xffb37a, 28, -1);
  if (zone === "ai") ambientParticles("particles-ai", 0x3cffa0, 44, 1);
}

// ============================================================
// FOOTER PARTICLE WORDMARK - canvas 2D, full-bleed edge-to-edge,
// fades out over the bottom half, assembles/disperses based on
// how close the footer is to being in view (scroll-linked).
// Sized in plain CSS pixels (no devicePixelRatio scaling) to keep
// this robust; retries once after load in case the footer hadn't
// been laid out yet on first run.
// ============================================================
(function(){
  var canvas = document.getElementById("foot-wordmark");
  var footerEl = document.getElementById("contact");
  if (!canvas || !footerEl) return;
  var ctx = canvas.getContext("2d");
  var particles = [];
  var drawing = false;

  function sampleTargets(w, h){
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var octx = off.getContext("2d");
    var text = "Janak Limbachia";
    var fontSize = Math.max(20, h * 0.42);
    octx.font = "700 " + fontSize + "px 'Playfair Display', serif";
    var measured = octx.measureText(text).width || 1;
    var scaleX = Math.min(1.2, (w * 0.9) / measured);
    octx.save();
    octx.translate(w/2, h/2);
    octx.scale(scaleX, 1);
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = "#fff";
    octx.fillText(text, 0, 0);
    octx.restore();
    var data;
    try { data = octx.getImageData(0,0,w,h).data; }
    catch(e){ return []; }
    var step = Math.max(2, Math.floor(w/300));
    var targets = [];
    for (var y = 0; y < h; y += step){
      for (var x = 0; x < w; x += step){
        if (data[(y*w+x)*4+3] > 128) targets.push({x:x, y:y});
      }
    }
    return targets;
  }

  function rebuild(){
    var w = Math.max(1, Math.round(canvas.clientWidth));
    var h = Math.max(1, Math.round(canvas.clientHeight));
    if (w < 20 || h < 20) return false;
    canvas.width = w; canvas.height = h;
    var targets = sampleTargets(w, h);
    if (!targets.length) return false;
    var cs = getComputedStyle(document.documentElement);
    var coral = (cs.getPropertyValue("--coral") || "#d85a30").trim();
    var sage = (cs.getPropertyValue("--sage") || "#5dcaa5").trim();
    var midY = h * 0.5;
    particles = targets.map(function(t){
      var fadeAlpha = t.y <= midY ? 1 : Math.max(0, 1 - (t.y - midY) / (h - midY));
      return {
        x: Math.random()*w, y: Math.random()*h,
        scatterX: Math.random()*w, scatterY: Math.random()*h,
        tx: t.x, ty: t.y,
        alpha: fadeAlpha,
        color: Math.random() > 0.5 ? coral : sage
      };
    });
    return true;
  }

  function assemblyFactor(){
    var rect = footerEl.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    // reaches full assembly quickly once the footer starts entering the
    // viewport, rather than requiring it to be scrolled almost to the top
    var entered = vh - rect.top;
    var f = entered / (vh * 0.25);
    return Math.max(0, Math.min(1, f));
  }

  function draw(){
    var factor = assemblyFactor();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(function(p){
      var dx = p.scatterX + (p.tx - p.scatterX) * factor;
      var dy = p.scatterY + (p.ty - p.scatterY) * factor;
      p.x += (dx - p.x) * 0.08;
      p.y += (dy - p.y) * 0.08;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0.15, p.alpha) * (0.4 + 0.6*factor);
      ctx.fillRect(p.x, p.y, 1.8, 1.8);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  function start(){
    var ok = rebuild();
    if (!ok){ setTimeout(start, 250); return; }
    if (!drawing){ drawing = true; draw(); }
  }
  if (document.fonts && document.fonts.load){
    document.fonts.load("700 60px 'Playfair Display'").catch(function(){}).then(start);
  } else {
    start();
  }
  window.addEventListener("load", function(){ rebuild(); });

  var resizeTimer = null;
  window.addEventListener("resize", function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 300);
  });
})();

// ============================================================
// WORK CARD PREVIEW IMAGES — any format works. Tries .jpg, .png,
// then .webp in turn for each project's slug, uses whichever file
// actually exists, hides the thumb cleanly if none do.
// ============================================================
document.querySelectorAll(".preview-img").forEach(function(img){
  var slug = img.dataset.slug;
  var exts = ["jpg", "png", "webp"];
  var i = 0;
  function tryNext(){
    if (i >= exts.length){ img.style.display = "none"; return; }
    img.src = "assets/previews/" + slug + "." + exts[i++];
  }
  img.onerror = tryNext;
  img.onload = function(){ img.style.display = "block"; };
  tryNext();
});
