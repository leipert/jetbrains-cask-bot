const definitions = [
  {
    caskName: 'appcode',
    jetbrainsCode: 'AC',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'clion',
    jetbrainsCode: 'CL',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'datagrip',
    jetbrainsCode: 'DG',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'goland',
    jetbrainsCode: 'GO',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'intellij-idea',
    jetbrainsCode: 'IIU',
    versionField: '<%= version %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'intellij-idea-ce',
    jetbrainsCode: 'IIC',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'jetbrains-toolbox',
    jetbrainsCode: 'TBA',
    versionField: '<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'mps',
    jetbrainsCode: 'MPS',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'phpstorm',
    jetbrainsCode: 'PS',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'pycharm',
    jetbrainsCode: 'PCP',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'pycharm-ce',
    jetbrainsCode: 'PCC',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'pycharm-with-anaconda-plugin',
    jetbrainsCode: 'PCP',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
    releaseType: 'macAnaconda',
  },
  {
    caskName: 'pycharm-ce-with-anaconda-plugin',
    jetbrainsCode: 'PCC',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
    releaseType: 'macAnaconda',
  },
  {
    caskName: 'pycharm-edu',
    jetbrainsCode: 'PCE',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'rider',
    jetbrainsCode: 'RD',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'rubymine',
    jetbrainsCode: 'RM',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'webstorm',
    jetbrainsCode: 'WS',
    versionField: '<%= version %>,<%= build %>',
    releaseChannel: 'release',
  },
  {
    caskName: 'youtrack-workflow',
    jetbrainsCode: 'YTWE',
    versionField: '<%= build %>',
    releaseChannel: 'release',
  },
];

module.exports = definitions;
