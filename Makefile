CONFIG_FILES = ../../configs/aisle.js ../../configs/client-aisle.js ../../settings/aisle.js

install: ../../configs ../../settings $(CONFIG_FILES)

$(CONFIG_FILES):
	cp $(abspath $(subst ../../,,$@)) $(abspath $@)

.PHONE: install
