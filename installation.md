
## To make uinput work without sudo
```bash
sudo groupadd -f uinput
sudo gpasswd -a pi uinput
echo 'KERNEL=="uinput",GROUP="uinput",MODE:="0660"' | sudo tee  /etc/udev/rules.d/99-input.rules
```

## gpio-button
```bash
sudo apt-get update
sudo apt-get install device-tree-compiler -y
dtc -@ -I dts -O dtb -o button4-overlay.dtb button4-overlay.dts
sudo cp button4-overlay.dtb /boot/overlays
echo 'device_tree_overlay=overlays/button4-overlay.dtb' | sudo tee --append /boot/config.txt > /dev/null
```

## pi-blaster
Install pi-blaster, setup PWM for pin 14 and auto startup.
```bash
sudo apt-get update
sudo apt-get install autoconf -y
git clone https://github.com/sarfata/pi-blaster.git
cd pi-blaster
./autogen.sh
./configure
make
sudo make install
cd ..
rm -rf pi-blaster
sudo sed -i 's/DAEMON_OPTS=".*"/DAEMON_OPTS="-g 14"/' /etc/default/pi-blaster
sudo systemctl enable pi-blaster -g 14
```
