# total width and height from
# > xrandr
total_width=3840
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
dev1_id=`xinput list | grep 'Wacom HID 516A Pen eraser' | grep -oP 'id=(\d)*' | grep -oP '\d*'`
dev2_id=`xinput list | grep 'Wacom HID 516A Finger touch' | grep -oP 'id=(\d)*' | grep -oP '\d*'`
dev2_id=`xinput list | grep 'Wacom HID 516A Pen stylus' | grep -oP 'id=(\d)*' | grep -oP '\d*'`

xinput set-prop ${dev1_id} --type=float "Coordinate Transformation Matrix" ${c0} 0 ${c1} 0 ${c2} ${c3} 0 0 1
xinput set-prop ${dev2_id} --type=float "Coordinate Transformation Matrix" ${c0} 0 ${c1} 0 ${c2} ${c3} 0 0 1
