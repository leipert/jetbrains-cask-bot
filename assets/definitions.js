const definitions = [
  { caskName: 'appcode', jetbrainsCode: 'AC', versionField: '<%= version %>' },
  { caskName: 'clion', jetbrainsCode: 'CL', versionField: '<%= version %>' },
  { caskName: 'datagrip', jetbrainsCode: 'DG', versionField: '<%= version %>' },
  {
    caskName: 'intellij-idea',
    jetbrainsCode: 'IIU',
    versionField: '<%= version %>'
  },
  {
    caskName: 'intellij-idea-ce',
    jetbrainsCode: 'IIC',
    versionField: '<%= version %>'
  },
  {
    caskName: 'jetbrains-toolbox',
    jetbrainsCode: 'TBA',
    versionField: '<%= version %>.<%= build %>'
  },
  { caskName: 'mps', jetbrainsCode: 'MPS', versionField: '<%= version %>' },
  { caskName: 'phpstorm', jetbrainsCode: 'PS', versionField: '<%= version %>' },
  { caskName: 'pycharm', jetbrainsCode: 'PCP', versionField: '<%= version %>' },
  {
    caskName: 'pycharm-ce',
    jetbrainsCode: 'PCC',
    versionField: '<%= version %>'
  },
  {
    caskName: 'pycharm-edu',
    jetbrainsCode: 'PCE',
    versionField: '<%= version %>'
  },
  { caskName: 'rubymine', jetbrainsCode: 'RM', versionField: '<%= version %>' },
  { caskName: 'webstorm', jetbrainsCode: 'WS', versionField: '<%= version %>' },
  {
    caskName: 'youtrack-workflow',
    jetbrainsCode: 'YTWE',
    versionField: '<%= build %>fix'
  }
];

module.exports = definitions;
