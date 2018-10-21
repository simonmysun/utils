# https://wiki.archlinux.org/index.php/wacom_tablet

# total width and height from
# > xrandr
total_width=7680
total_height=2160

touch_area_width=3840
touch_area_height=2160
touch_area_x_offset=0
touch_area_y_offset=0

c0=`lua -e "print($touch_area_width/$total_width)"`
c2=`lua -e "print($touch_area_height/$total_height)"`
c1=`lua -e "print($touch_area_x_offset/$total_width)"`
c3=`lua -e "print($touch_area_y_offset/$total_height)"`

# device id from
# > xinput list
dev1_id=18 # Wacom HID 516A Pen eraser
dev2_id=15 # Wacom HID 516A Finger touch
dev2_id=14 # Wacom HID 516A Pen stylus

xinput set-prop ${dev1_id} --type=float "Coordinate Transformation Matrix" ${c0} 0 ${c1} 0 ${c2} ${c3} 0 0 1
xinput set-prop ${dev2_id} --type=float "Coordinate Transformation Matrix" ${c0} 0 ${c1} 0 ${c2} ${c3} 0 0 1

# Remapping buttons
device_name="Wacom HID 516A Pen stylus"
button_code=2
function_key_code=3
xsetwacom set "$device_name" Button $button_code $function_key_code
