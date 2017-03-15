## Install Raspbian on SD-card
```bash
diskutil list
diskutil unmountDisk /dev/disk<disk# from diskutil>
sudo dd bs=1m if=image.img of=/dev/rdisk<disk# from diskutil>
```
This will take a few minutes, depending on the image file size. You can check the progress by sending a SIGINFO signal (press Ctrl+T).
### Init config
```bash
# Run the raspi-config (at first boot you will end up in the config).
# But if you don't run the following.
sudo raspi-config
# To do in raspi-config:
# Expand the filesystem.
# Change the default password for the "pi" user.
# Set you language and keyboard layout.
# -> Under advanced options...
# Set your hostname.
# Enable SSH-server.
# (Update to the latest version)

# Fix locale: Cannot set LC_CTYPE to default locale: No such file or directory
sudo locale-gen "en_US.UTF-8"
sudo dpkg-reconfigure locales

# Upgrade it.
sudo apt-get update
sudo apt-get full-upgrade

# Setting screen resolution.
# For this screen: http://www.dx.com/p/10-1-digital-ips-screen-1280-x-800-drive-board-for-raspberry-pcduino-cubieboard-black-275804#.VOuY9vmG_S4
sudo nano /boot/config.txt
# enable and change the following values.
hdmi_force_hotplug=1
hdmi_group=2
hdmi_mode=28
# Comment out all other lines regarding HDMI and Overscan.
# Save and exit.

# Remove the annoying warning on boot.
sudo nano /boot/cmdline.txt
# Add the following before elevator=deadline.
cgroup_enable=memory 
# If you want to quiet down the kernel and remove the logo at start.
# Add the following at the end of the line.
logo.nologo quiet

# Save, exit and reboot.
```

## Install samba for network sharing
```bash
sudo apt-get install samba samba-common-bin
sudo smbpasswd -a pi
```
You also need to add the following section of code to `sudo nano /etc/samba/smb.conf`:
```
[pihome]
   comment= Pi Home
   path=/home/pi
   browseable=Yes
   writeable=Yes
   only guest=no
   create mask=0777
   directory mask=0777
   public=no
```

## Install MongoDB
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install mongodb-server -y
sudo /etc/init.d/mongodb start
```

## Install Node.js
```bash
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
sudo apt install nodejs
```
## Getting abbir
```bash
sudo apt-get install git -y
git clone https://github.com/lindehoff/abbir.git
cd abbir
```

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
dtc -@ -I dts -O dtb -o setup/gpio-button4-overlay.dtb setup/gpio-button4-overlay.dts
sudo mv setup/gpio-button4-overlay.dtb /boot/overlays
echo 'device_tree_overlay=overlays/gpio-button4-overlay.dtb' | sudo tee --append /boot/config.txt > /dev/null
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
## fbi

## Install LIRC and listen on gpio 23
```bash
sudo apt-get install lirc -y
echo 'lirc_dev
lirc_rpi gpio_in_pin=23' | sudo tee --append /etc/modules > /dev/null
echo 'dtoverlay=lirc-rpi,gpio_in_pin=23,gpio_in_pull=high' | sudo tee --append /boot/config.txt > /dev/null
sudo cp -f setup/lirc-hardware.conf /etc/lirc/hardware.conf
```

## Using pm2
```bash
# Install pm2 
npm install pm2 -g 
# Add the app
pm2 start app.js --name abbir --kill-timeout 5000
```
