# Project NightLock
Explore Our NASA Space Apps Challenge 2026 Project!
https://chipper-panda-9e3ceb.netlify.app/

**See how the infrared sky changes over time.**

NightLock Sky Explorer is a browser-based tool built for the **2026 NASA Space Apps Challenge — Planet X and SPHEREx**. It lets students, educators, and anyone curious about astronomy compare real SPHEREx observations without downloading FITS files or installing astronomy software.

Our Python pipeline produced **1,172 aligned image cutouts across five known targets** using archived NASA/IPAC IRSA Level 2 observations. The Explorer shows how an object can move across the sky, change in brightness, or do both.

[Challenge brief](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/) · [NASA SPHEREx mission](https://science.nasa.gov/mission/spherex/) · [SPHEREx data archive](https://irsa.ipac.caltech.edu/Missions/spherex.html)

## Explore the sky

- Pick a target on the sky map or search by name or coordinates. Try `Barnard's Star` or `269.45 4.69`. Coordinate search matches nearby prepared targets.
- Select one detector group (D1–D6) and choose dates from the available observations. Comparing within one detector group helps reduce differences caused by wavelength.
- Zoom, pan, and turn on the target marker, predicted path, or coordinate grid to inspect the field.
- Click a point on the relative-brightness chart to open that observation. A value of **1.0** is the median for the selected detector group. Use **Copy Link** to share the selected view.

| View | What it shows |
| --- | --- |
| Time-lapse | Play a sequence of observations in date order. |
| Blink | Alternate between two aligned frames to spot changes. |
| Side by Side | Compare two dates without switching back and forth. |
| Difference | Subtract frame B from frame A. Cyan marks where A is brighter, and orange marks where B is brighter. |
| Stack | Average aligned frames to reduce some random noise. A moving source can look stretched in the result. |

## Try two examples

1. **See motion.** Select **Barnard’s Star → D5**. Set frame A to **21 August 2025** and frame B to **22 September 2026**. Compare them in **Blink**, then switch to **Difference**. The catalogue motion predicts a shift of about **1.8 pixels** across those 397 days.
2. **See brightness change.** Select **RW Aurigae → D2** and open the brightness chart. Values range from **0.50× to 1.66×** the median for that detector group. Click a point to inspect its frame.

## Targets and validation

| Target | What we found |
| --- | --- |
| Barnard’s Star | Offline motion estimates were **9.8–10.5 arcseconds per year** across six detector groups, compared with **10.39** in the reference catalogue. |
| Epsilon Indi B | Recovered in five detector groups. |
| WISE 0855−0714 | Too faint for reliable tracking in individual frames. |
| RW Aurigae | Relative brightness varied. In D5–D6, the report found **28–33% scatter**, compared with about **7.5%** for Barnard’s Star. |
| R Draconis | Saturated in most frames, limiting reliable brightness comparisons. |

The offline motion estimates come from fitting target positions over time. They are separate from the viewer’s predicted path and its two-frame shift estimate.

## How the data gets to the browser

1. Retrieve SPHEREx Level 2 FITS observations from IRSA and record the observation IDs.
2. Use the FITS World Coordinate System (WCS) to align observations onto the same sky grid.
3. Apply a shared display scale within each target and detector group so frames are visually comparable.
4. Estimate brightness from valid pixels in a target aperture after subtracting the local background. Display-only pixel fills are excluded from this measurement.
5. Export PNGs for viewing and JSON metadata for dates, detector groups, quality information, relative brightness, and source FITS filenames.

## Run the static Explorer locally

Keep the exported images and JSON with the frontend files. From the folder containing `sky-explorer.html`, start a local web server with Python 3:

```bash
python -m http.server 8000
```

Open [http://localhost:8000/sky-explorer.html](http://localhost:8000/sky-explorer.html). If your system uses `python3`, run `python3 -m http.server 8000` instead.

The Explorer is built with HTML, CSS, and JavaScript and can be hosted on GitHub Pages. It does not require the separate Python/SQLite backend. Admin tools, newsletter delivery, server-managed feedback, and the NightLock AI guide’s web search require a separately running backend. The AI guide is not used for measurements or validation.

## Limitations and next steps

- NightLock shows archived observations of five prepared targets. It is not a live telescope feed, an all-sky search, or a planet discovery system.
- Wavelength can vary even within a detector group. The chart shows relative brightness for comparison, not a calibrated light curve.
- Alignment errors and noise can leave marks in Difference view. A residual by itself is not proof of motion.
- Next steps include requesting cutouts from IRSA for user-selected coordinates, improving faint-source handling, and tracking the calibration release for each observation.

## Credits

Built by **Team Project NightLock** for the **2026 NASA Space Apps Challenge**.

Observations come from the [NASA/IPAC IRSA SPHEREx archive](https://irsa.ipac.caltech.edu/Missions/spherex.html). SPHEREx is a JPL and Caltech project funded by NASA. Catalogue references come from [SIMBAD](https://simbad.astro.unistra.fr/simbad/). See the [IRSA archive guide](https://irsa.ipac.caltech.edu/spherex-archive-documentation/) for data access and documentation.

Claude assisted with code development, debugging, Git setup, and early report drafting.
