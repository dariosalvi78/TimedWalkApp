### Edits to TimedWalk App to investigate data quality

## Computed features: 
- Maximum time gap between samples. 
- Average sampling frequency 
- Curvatura / heading, should match with 0,1,2 (public dataset).

parameters_bounds = {
    'max_gap': 30, # sec
    'avg_fs': 0.8, # Hz 
    'curvatura': XX, #
}

## Decision logic (to make quality check meaningful)
This happens in signalCheck.js
If parameters out of bounds, return warning message.
Report on screen important instructions. Button to restart the test 

## Website: 


