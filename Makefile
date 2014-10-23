CONFIG_FILES = ../configs/aisle.js ../configs/client-aisle.js ../settings/aisle.js

install: ../configs ../settings $(CONFIG_FILES)

$(CONFIG_FILES):
	ln -sf $(abspath $(subst ../,,$@)) $(abspath $@)

.PHONE: install
