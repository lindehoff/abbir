
# To make uinput work without sudo
```bash
sudo groupadd -f uinput
sudo gpasswd -a pi uinput
echo 'KERNEL=="uinput",GROUP="uinput",MODE:="0660"' | sudo tee  /etc/udev/rules.d/99-input.rules
```
