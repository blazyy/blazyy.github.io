const margin_top_percentage = 0.4,
    bar_color = 255,
    available_sorts = {
        'bubble': bubble_sort,
        'cocktail': cocktail_shaker_sort,
        'selection': selection_sort,
        'insertion': insertion_sort,
        'shell': shell_sort,
        'quicksort': quick_sort,
        'merge': merge_sort,
        'heap': heap_sort
    };

let colored_bars = true,
    num_bars = 150,
    bar_width,
    bar_color_width = 2,
    currently_sorting = false,
    stopped = false,
    selected_sort = 'bubble',
    bar_heights = [], // Didn't make this const since merge sort needs the array to be reassignable
    bar_colors = [], // same
    color_gradients = [],
    random_color_index,
    retrieved_gradients = true;

function setup() {
    frameRate(60);
    createCanvas(windowWidth, windowHeight);
    bar_width = windowWidth / num_bars;
    axios.get('https://raw.githubusercontent.com/ghosh/uiGradients/master/gradients.json')
        .then(function(response) {
            color_gradients = response.data;
            random_color_index = Math.floor(Math.random() * color_gradients.length + 1);
        })
        .catch(function(error) {
            console.log(error);
            retrieved_gradients = false;
        })
        .then(function() {
            generate_heights_and_color_in();
            draw_bars();
            noLoop();
        });
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

function generate_heights_and_color_in() {
    bar_heights.splice(0, bar_heights.length);
    for (let i = 0; i < num_bars; i++)
        bar_heights.push(Math.floor(Math.random() * (windowHeight - (windowHeight * margin_top_percentage))));
    set_bar_colors();
}

function set_bar_colors() {
    bar_colors.splice(0, bar_colors.length); // empties array
    if (colored_bars) {
        let color_scale;
        if (retrieved_gradients)
            color_scale = chroma.scale(color_gradients[random_color_index].colors).domain([0, Math.max(...bar_heights)]);
        else {
            color_scale = chroma.scale(['yellow', 'navy']).mode('lch').domain([0, Math.max(...bar_heights)]);
            $('#new-colors-button').hide(); // Hides new colors button in case there is something wrong with the github link with the gradients .json file.
        }
        for (let i = 0; i < num_bars; i++) {
            let new_color = color_scale(bar_heights[i]),
                r = Math.floor(new_color._rgb[0]),
                g = Math.floor(new_color._rgb[1]),
                b = Math.floor(new_color._rgb[2]);
            bar_colors.push(color(r, g, b));
        }
    } else {
        for (let i = 0; i < num_bars; i++)
            bar_colors.push(color('white'));
    }
    loop();
    noLoop();
}

function windowResized() {
    redraw_bars(resize = true);
}

function redraw_bars(resize = false) {
    if (!currently_sorting) {
        $('#start-button').removeAttr('disabled');
        bar_width = windowWidth / num_bars;
        generate_heights_and_color_in();
        if (resize)
            resizeCanvas(windowWidth, windowHeight);
    }
}

$(document).ready(function() {
    initialize();
});

function initialize() {
    $('#num-bars-range').on('input', function() {
        num_bars = $(this).val();
        redraw_bars();
    });

    $('#sort-select-dropdown').on('change', function() {
        selected_sort = $(this).val();
    });

    $('#color-toggle-switch').on('change', function() {
        if ($('#color-toggle-switch').is(':checked')) {
            colored_bars = true;
            $('#new-colors-button').removeAttr('disabled');
        } else {
            $('#new-colors-button').attr('disabled', true);
            colored_bars = false;
        }
        set_bar_colors();
    });

    $('#start-button').on('click', async function() {
        $('#num-bars-range, #color-toggle-switch, #sort-select-dropdown, #start-button, #new-button, #new-colors-button').attr('disabled', true);
        $('#reset-button').removeAttr('disabled');
        currently_sorting = true;
        loop();
        await available_sorts[selected_sort]();
        noLoop();
        currently_sorting = false;
        $('#num-bars-range, #color-toggle-switch, #sort-select-dropdown, #new-button').removeAttr('disabled');
        if (colored_bars) {
            $('#new-colors-button').removeAttr('disabled');
        }
    });

    $('#new-button').on('click', () => redraw_bars(resize = true));

    $('#reset-button').on('click', () => window.location.reload());

    $('#new-colors-button').on('click', () => {
        random_color_index = Math.floor(Math.random() * color_gradients.length + 1);
        set_bar_colors();
    });
}