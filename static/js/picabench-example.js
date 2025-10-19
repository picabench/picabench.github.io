(function () {
  const EXAMPLES = [
    {
      src: 'static/img/PICABench_Example/example_optics_lightpropagation.png',
      label: 'Optics · Light Propagation'
    },
    {
      src: 'static/img/PICABench_Example/example_optics_lightsource.png',
      label: 'Optics · Light Source Effects'
    },
    {
      src: 'static/img/PICABench_Example/example_optics_reflection.png',
      label: 'Optics · Reflection'
    },
    {
      src: 'static/img/PICABench_Example/example_optics_refraction.png',
      label: 'Optics · Refraction'
    },
    {
      src: 'static/img/PICABench_Example/example_mechanics_causality.png',
      label: 'Mechanics · Causality'
    },
    {
      src: 'static/img/PICABench_Example/example_mechanics_deformation.png',
      label: 'Mechanics · Deformation'
    },
    {
      src: 'static/img/PICABench_Example/example_state_gst.png',
      label: 'State Transition · Global'
    },
    {
      src: 'static/img/PICABench_Example/example_state_lst.png',
      label: 'State Transition · Local'
    }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('picabench-example-gallery');
    if (!root || EXAMPLES.length === 0) {
      return;
    }

    const imageEl = root.querySelector('#picabench-example-image');

    const state = {
      index: 0,
      timer: null
    };

    function render() {
      const item = EXAMPLES[state.index];
      if (!item) {
        return;
      }
      imageEl.src = item.src;
      imageEl.alt = item.label;
    }

    function navigate(delta, options = {}) {
      const total = EXAMPLES.length;
      state.index = (state.index + delta + total) % total;
      render();
      if (!options.skipRestart) {
        restartAuto();
      }
    }

    function startAuto() {
      stopAuto();
      state.timer = window.setInterval(() => navigate(1, { skipRestart: true }), 2000);
    }

    function stopAuto() {
      if (state.timer) {
        window.clearInterval(state.timer);
        state.timer = null;
      }
    }

    function restartAuto() {
      startAuto();
    }

    root.addEventListener('pointerenter', stopAuto);
    root.addEventListener('pointerleave', startAuto);

    window.addEventListener('keydown', (event) => {
      if (!root.contains(document.activeElement) && document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      }
    });

    render();
    startAuto();
  });
})();
