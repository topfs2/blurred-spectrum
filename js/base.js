var getTime = function () {
    return (new Date()).getTime() / 1000.0;
};

var startTime = getTime();
var getDeltaTime = function () {
    return getTime() - startTime;
};

var spectrumColor = tinycolor("#f1c40f").toRgbString();

function createBar(r, h, s) {
    var r2 = r * 0.5;
    var geometry = new THREE.PlaneGeometry(r, r + r2, 1, 3);

    var material = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture(s),
        color: new THREE.Color(spectrumColor),
        transparent: true,
    });

    var bar = new THREE.Mesh(geometry, material);

    bar.setHeight = function (e) {
        var h2 = e * h * 0.5;
        var y = h2 + r2;

        var v = geometry.vertices;
        v[0].y = v[1].y =  r2;
        v[2].y = v[3].y =  0;
        v[4].y = v[5].y = -h2 * 2.0;
        v[6].y = v[7].y = -h2 * 2.0 - r2;

        bar.geometry.verticesNeedUpdate = true;
    };

    bar.setHeight(0);

    return bar;
}

function createBlurredBar(w, h) {
    var group = new THREE.Object3D();

    var main = createBar(w, h, "img/pure_tmb_r4px.png");
    var blur = createBar(w * 16, h, "img/pure_tmb_r32px_blur.png");
    blur.material.opacity = 0.0;

    group.add(main);
    group.add(blur);

    group.setHeight = function (e) {
        main.setHeight(e);
        blur.setHeight(e);
        blur.material.opacity = Math.min(e * 0.5, 0.1);
    };

    group.setHeight(0);

    return group;
}

function createSpectrum(n, w, h, g, create) {
    var group = new THREE.Object3D();

    for (var i = 0; i < n; i++) {
        var bar = create(w, h);
        bar.position.x = i * (w + g);
        group.add(bar);
    }

    group.position.x = n * (w + g) * -0.5

    group.update = function (bands) {
        for (var i = 0; i < bands.length; i++) {
            var bar = group.children[i];
            if (bar) {
                bar.setHeight(bands[i]);
            }
        }
    }

    return group;
}

(function () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var w2 = w * 0.5;
    var h2 = h * 0.5;

	var webglEl = document.getElementById('webgl');

	if (!Detector.webgl) {
		Detector.addGetWebGLMessage(webglEl);
		return;
	}

    if (!AudioAnalyser.enabled) {
        webglEl.appendChild(document.createTextNode("AudioAnalyser failed to initialize"));
        return;
    }

    $(".info").css("color", spectrumColor);

    var MP3_PATH = "https://a.tumblr.com/tumblr_n6k5kd8E0W1sadul5o1.mp3";
    var NUM_BANDS = 128;
    var SMOOTHING = 0.5;

    var sound = true;
    analyser = sound ? new AudioAnalyser(MP3_PATH, NUM_BANDS, SMOOTHING) : { start: function () { }, audio: $("<div />")[0] };

    var scene = new THREE.Scene();

    var camera = new THREE.OrthographicCamera(-w2, w2, h2, -h2, -1, 1000);

    var spectrum = createSpectrum(NUM_BANDS, 4, 256, 12, function (w, h) {
        return createBlurredBar(w, h);
    })
    spectrum.position.x = -w2 + 12;

    scene.add(camera);
    scene.add(spectrum);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);

    analyser.onUpdate = (function(_this) {
        return function (bands, min, max) {
            var e = 0;
            for (var i = 0; i < bands.length; i++) {
                var b = Math.max(bands[i], min);
                bands[i] = (b - min) / (max - min);
            };

            spectrum.update(bands);
        };
    })(this);

    var t = 0;
    function render() {
        var oldTime = t;
        t = getDeltaTime();
        var dt = t - oldTime;

        renderer.render(scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    analyser.start();
    document.body.appendChild(analyser.audio);
    webglEl.appendChild(renderer.domElement);

    animate();
})();
