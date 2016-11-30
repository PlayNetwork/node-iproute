var os = require('os');

// Link types.
exports.types = {
  loopback   : 'loopback',    // Loopback.
  ethernet   : 'ether',       // Ethernet.
  pointopoint: 'ppp'          // Point to Point.
};

// Virtual link types.
exports.vl_types = {
  bridge : 'bridge',   // Ethernet Bridge device.
  can    : 'can',      // Controller Area Network interface.
  dummy  : 'dummy',    // Dummy network interface.
  ifb    : 'ifb',      // Intermediate Functional Block device.
  ipoib  : 'ipoib',    // IP over Infiniband device.
  macvlan: 'macvlan',  // Virtual interface base on link layer address (MAC).
  vcan   : 'vcan',     // Virtual Local CAN interface.
  veth   : 'veth',     // Virtual ethernet interface.
  vlan   : 'vlan',     // 802.1q tagged virtual LAN interface.
  vxlan  : 'vxlan'     // Virtual eXtended LAN.
};

// Interface flags.
exports.flags = [
  'UP',
  'LOOPBACK',
  'BROADCAST',
  'POINTOPOINT',
  'MULTICAST',
  'PROMISC',
  'ALLMULTI',
  'NOARP',
  'DYNAMIC',
  'SLAVE',

  // Undocumented.
  'LOWER_UP',
  'NO-CARRIER',
  'M-DOWN'
];

exports.flag_statuses = {
  on : 'on',
  off: 'off'
};

// Interface statuses.
exports.statuses = {
  UP            : 'UP',               // Ready to pass packets (if admin status is changed to up, then operational status should change to up if the interface is ready to transmit and receive network traffic).
  DOWN          : 'DOWN',             // If admin status is down, then operational status should be down.
  UNKNOWN       : 'UNKNOWN',          // Status can not be determined for some reason.
  LOWERLAYERDOWN: 'LOWERLAYERDOWN',   // Down due to state of lower layer interface.
  NOTPRESENT    : 'NOTPRESENT',       // Some component is missing, typically hardware.
  TESTING       : 'TESTING',          // In test mode, no operational packets can be passed.
  DORMANT       : 'DORMANT'           // Interface is waiting for external actions.
};

/**
 * Parses .show() output.
 *
 * @param raw_data
 * @returns {Array}
 */
exports.parse_links = function (raw_data) {
  if (!raw_data) {
    throw new Error('Invalid arguments.');
  }
  else {
    var platform = os.platform();
    var isBsd = (platform === 'darwin' || platform === 'freebsd');

    /*
     * Process the output to give parsed results.
     */
    var links = [];

    var output = raw_data.split('\n');

    var
      line,
      link,
      name;
    var output_length;
    if (isBsd) {
      var link_index = 0;
      for (line = 0, output_length = output.length - 1;
           line < output_length;
           line++) {

        var current_line = output[line];
        var current_line_fields = current_line.trim().split(/\s/g);

        var possible_link_index = (new RegExp(/^[a-z].*[0-9]:$/)).test(current_line_fields[0]);
        if (possible_link_index) {
          name = current_line_fields[0].split(':')[0];
          link = {
            index: link_index++, // Don't needed since the array is ordered anyway but just in case.
            name : name,
            flags: current_line_fields[1].slice(current_line_fields[1].indexOf('<')+1, -1).split(','), // First remove the <,> chars.
          };
          links.push(link);
        }
        else {
          // Still parsing the last link.
          if (current_line_fields[0] === 'ether') {
            link.mac = current_line_fields[1];
          }
          if (current_line_fields[0] === 'status') {
            link.status = current_line_fields[1];
          }
          // link.type = link_fields_2[0].split('\/')[1],
          // link.brd = link_fields_2[3]
        }
      }
    } else {
      for (line = 0, output_length = output.length - 1;
           line < output_length;
           line += 2 /* Each link is composed for two lines. */) {

        var link_line_1 = output[line];
        var link_fields_1 = link_line_1.trim().split(/\s/g);

        var link_line_2 = output[line + 1];
        var link_fields_2 = link_line_2.trim().split(/\s/g);

        name = link_fields_1[1].split(':')[0];
        link = {
          index: link_fields_1[0].split(':')[0], // Don't needed since the array is ordered anyway but just in case.
          name : name,
          flags: link_fields_1[2].slice(1, -1).split(','), // First remove the <,> chars.

          type: link_fields_2[0].split('\/')[1],

          mac: link_fields_2[1],
          brd: link_fields_2[3]
        };

        /*
         * Parses dynamically the following fields, if are there.
         *
         * mtu
         * qdisc
         * state
         * mode
         * qlen
         */
        var rest_line_fields = link_fields_1.slice(3);
        for (var i = 0, rest_line_length = rest_line_fields.length - 1;
             i < rest_line_length;
             i += 2 /* Each field is composed for two consecutive items. */) {

          link[rest_line_fields[i]] = rest_line_fields[i + 1];
        }

        /*
         * Parses and append the virtual link type, if any.
         */
        if (name.split('@').length == 2) {
          // Is a VLAN.
          link['vl_type'] = 'vlan';
          link['name'] = name.split('@')[0];
        }

        /*
         * Finally, add the parsed link to the output.
         */
        links.push(link);
      }
    }

    return links;
  }
};
