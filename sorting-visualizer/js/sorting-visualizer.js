const margin_top_percentage = 0.5;
const bar_color = 255;
const bar_colors = [];
const available_sorts = {
    'bubble': bubble_sort,
    'selection': selection_sort,
    'quicksort_l': quick_sort_lomuto,
    'quicksort_h': quick_sort_hoare,
    'insertion': insertion_sort,
    'merge': merge_sort
}

let num_bars = 200;
let bar_width;
let bar_color_width = 2;
let currently_sorting = false;
let stopped = false;
let selected_sort = 'bubble';
let bar_heights = []; // Didn't make this const since merge sort needs the array to be reassignable

function setup() {
    frameRate(60);
    createCanvas(windowWidth, windowHeight);
    bar_width = windowWidth / num_bars;
    generate_heights();
    draw_bars();
    noLoop();
}

function draw() {
    background(0);
    draw_bars();
}

function draw_bars() {
    for (let i = 0; i < num_bars; i++) {
        stroke(color('black'));
        fill(bar_colors[i]);
        rect(i * bar_width, height - bar_heights[i], bar_width, bar_heights[i]);
    }
}

function generate_heights() {
    bar_heights.splice(0, bar_heights.length); // empties array
    for (let i = 0; i < num_bars; i++) {
        bar_heights.push(Math.floor(Math.random() * (windowHeight - (windowHeight * margin_top_percentage))));
        bar_colors.push(color('white'));
    }
}

function windowResized() {
    redraw_bars(resize = true);
}

function redraw_bars(resize = false) {
    if (!currently_sorting) {
        $('#start-button').removeAttr('disabled');
        bar_width = windowWidth / num_bars;
        loop();
        generate_heights();
        noLoop();
        if (resize)
            resizeCanvas(windowWidth, windowHeight);
    }
}

$(document).ready(function() {
    initialize();
});

function initialize() {
    $('#start-button').on('click', async function() {
        $('#start-button, #num-bars-range, #new-button, #sort-select-dropdown').attr('disabled', true);
        $('#reset-button').removeAttr('disabled');
        currently_sorting = true;
        loop();
        await available_sorts[selected_sort]();
        noLoop();
        currently_sorting = false;
        $('#sort-select-dropdown, #new-button, #num-bars-range').removeAttr('disabled');
    });

    $('#new-button').on('click', () => redraw_bars());

    $('#num-bars-range').on('input', function() {
        num_bars = $(this).val();
        redraw_bars();
    });

    $('#sort-select-dropdown').on('change', function() {
        selected_sort = $(this).val()
    });

    $('#reset-button').on('click', () => window.location.reload());
}