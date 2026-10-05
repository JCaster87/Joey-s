# Python motion graphics (no Remotion)

Same Figure It Out chapter 3 graphics as `src/figure-it-out/`, drawn frame by
frame with pycairo and piped into ffmpeg.

    pip install pycairo numpy
    cp python-graphics/fonts/*.ttf ~/.local/share/fonts/ && fc-cache -f
    python3 python-graphics/fio_slime_factory.py out/video.mp4
    python3 python-graphics/fio_slime_factory.py --still 100 out/f100.png
