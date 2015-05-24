module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    var javascriptsToCompile = [
        'app/client.js',
        'app/server-notifications.js',
        'app/views/**/*.js',
        'app/views/templates/**/*.jade'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            options: {
                browserifyOptions: {
                    debug: true
                }
            },
            dist: {
                files: {
                    'public/client.js': javascriptsToCompile,
                },
                options: {
                    transform: ['jadeify'],
                    plugin: [['minifyify', {map: 'client.map.json', output: 'public/client.map.json'}]],
                }
            }
        },
        stylus: {
            compile: {
                files: {
                    'public/client.css': ['css/**/*']
                }
            }
        },
        cssmin: {
            options: {
                sourceMap: true
            },
            target: {
                files: {
                    'public/vendor.css': ['node_modules/bootstrap/dist/css/bootstrap.css'],
                    'public/client.css': ['public/client.css']
                }
            }
        },
        watch: {
            scripts: {
                files: javascriptsToCompile.concat(['css/**/*']),
                tasks: ['default']
            }
        }
    });

    grunt.registerTask('default', [
        'browserify',
        'stylus',
        'cssmin'
    ]);
};
