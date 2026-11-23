document.addEventListener("DOMContentLoaded", () => {
  const section = document.getElementById("artf-visualization");
  if (!section) return;

  const canvases = [...section.querySelectorAll("canvas[data-method]")];
  const tabs = [...section.querySelectorAll(".artf-category-tab")];
  const sceneSlider = document.getElementById("artfSceneSlider");
  const sceneValue = document.getElementById("artfSceneValue");
  const samplePrev = document.getElementById("artfSamplePrev");
  const sampleNext = document.getElementById("artfSampleNext");
  const caption = document.getElementById("artfCaption");

  const imageRoot = "static/images/artf-comparison/";
  const sceneCount = Number(sceneSlider.max);
  const sampleCount = 8;
  const cache = new Map();
  let gallery;
  let category = tabs[0];
  let sceneIndex = 0;
  let sampleIndex = 0;
  let selection = 0;

  function loadImage(filename) {
    if (!cache.has(filename)) {
      const image = new Image();
      image.src = imageRoot + filename;
      const ready = image.decode().then(() => image).catch(error => {
        cache.delete(filename);
        throw error;
      });
      if (cache.size === 16) cache.delete(cache.keys().next().value);
      cache.set(filename, ready);
    }
    return cache.get(filename);
  }

  function drawPair(canvas, image, points) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const [x1, y1, x2, y2] = points.map((value, index) => (
      value * (index % 2 === 0 ? canvas.width : canvas.height)
    ));

    const radius = canvas.width / 75;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = radius / 2;
    ctx.strokeStyle = "#111827";
    ctx.stroke();
    ctx.lineWidth = radius / 3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    for (const [x, y, color, label] of [[x1, y1, "#dc2626", "x1"], [x2, y2, "#2563eb", "x2"]]) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = radius / 3;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.font = `600 ${radius * 1.45}px sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const labelX = Math.max(3, Math.min(canvas.width - textWidth - 4, x + radius * 1.4));
      const labelY = Math.max(radius * 1.45, Math.min(canvas.height - 3, y - radius));
      ctx.lineJoin = "round";
      ctx.lineWidth = radius / 2;
      ctx.strokeStyle = "#111827";
      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);
    }
  }

  async function showSample() {
    const request = ++selection;
    const scenes = gallery.samples[category.dataset.category];
    const samples = scenes[sceneIndex];
    const sample = samples[sampleIndex];
    sceneValue.textContent = `Scene ${sceneIndex + 1} / ${sceneCount}`;
    samplePrev.disabled = sampleIndex === 0;
    sampleNext.disabled = sampleIndex === sampleCount - 1;
    caption.textContent = "Loading sample…";

    try {
      const image = await loadImage(sample.image);
      if (request !== selection) return;

      for (const canvas of canvases) {
        const index = gallery.methods.indexOf(canvas.dataset.method);
        drawPair(canvas, image, sample.points[index]);
      }

      const sampleLabel = String(sampleIndex + 1).padStart(2, "0");
      caption.textContent = `${category.textContent.trim()} - Scene ${sceneIndex + 1} - Sample ${sampleLabel} / 08`;
      const neighbors = [
        samples[sampleIndex - 1], samples[sampleIndex + 1],
        scenes[sceneIndex - 1]?.[0], scenes[sceneIndex + 1]?.[0]
      ];
      for (const neighbor of neighbors) {
        if (neighbor) loadImage(neighbor.image).catch(() => {});
      }
    } catch {
      if (request === selection) caption.textContent = "Could not load this sample. Try another sample or reload the page.";
    }
  }

  function bindControls() {
    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        category = tab;
        sceneIndex = 0;
        sampleIndex = 0;
        sceneSlider.value = "1";
        for (const item of tabs) item.classList.toggle("is-active", item === tab);
        showSample();
      });
    }

    sceneSlider.addEventListener("input", () => {
      sceneIndex = Number(sceneSlider.value) - 1;
      sampleIndex = 0;
      showSample();
    });

    samplePrev.addEventListener("click", () => {
      if (sampleIndex === 0) return;
      sampleIndex -= 1;
      showSample();
    });
    sampleNext.addEventListener("click", () => {
      if (sampleIndex === sampleCount - 1) return;
      sampleIndex += 1;
      showSample();
    });

    for (const control of [...tabs, sceneSlider]) control.disabled = false;
  }

  for (const control of [...tabs, sceneSlider, samplePrev, sampleNext]) control.disabled = true;

  fetch(imageRoot + "samples.json")
    .then(response => {
      if (!response.ok) throw new Error("Cannot load the sample manifest");
      return response.json();
    })
    .then(data => {
      gallery = data;
      bindControls();
      showSample();
    })
    .catch(() => {
      caption.textContent = "Could not load the comparison. Reload the page to try again.";
    });
});
