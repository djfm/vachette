module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            dist: {
                files: {
                    'public/client.js': ['app/client.js', 'templates/**/*.jade'],
                },
                options: {
                    transform: ['jadeify']
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
            target: {
                files: {
                    'public/vendor.css': ['node_modules/bootstrap/dist/css/bootstrap.css']
                }
            }
        },
        watch: {
            scripts: {
                files: ['app/**/*.js', 'lib/**/*.js', 'css/**/*', 'templates/**/*.jade'],
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
