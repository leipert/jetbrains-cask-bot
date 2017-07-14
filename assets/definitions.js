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
        caskName: 'gogland',
        jetbrainsCode: 'GO',
        versionField: '<%= version %> EAP,<%= build %>',
        releaseChannel: 'eap',
    },
    {
        caskName: 'intellij-idea',
        jetbrainsCode: 'IIU',
        versionField: '<%= version %>,<%= build %>',
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
        versionField: '<%= version %>.<%= build %>',
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
        caskName: 'pycharm-edu',
        jetbrainsCode: 'PCE',
        versionField: '<%= version %>,<%= build %>',
        releaseChannel: 'release',
    },
    {
        caskName: 'rider',
        jetbrainsCode: 'RD',
        //        versionField: '<%= version %>,<%= build %>',
        versionField: '2017.1,<%= build %>',
        releaseChannel: 'eap',
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
