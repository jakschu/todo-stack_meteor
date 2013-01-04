// Questions
//
// *   seems like I have to put extra js logic into rendered
//     is that the right way to do it?
// *   does multiple events require a space after comma?
// *   is testing !Sessions.equals('foo', null) worth doing before get

// TODO
//
// *   security!
// *   user accounts
// *   multiple stacks
// *   collaboration

Tasks = new Meteor.Collection('tasks');

if (Meteor.isClient) {

    //
    // Help Arrow
    //
    Template.helpArrow.show = function() {
        return Session.get('noBoxes');
    };

    function addTask() {
        //TODO - is there a way to delay server-side insert?
        var taskId = Tasks.insert({
            text: '',
            created: (new Date()).toGMTString(),
            active: true
        });
        Session.set('selectedTask', taskId);
        Session.set('editTask', taskId);
    }

    Meteor.startup(function() {
        $('#add-task').click(function(e) {
            e.preventDefault();
            addTask();
        });
    });

    //
    // Boxes
    //

    Session.set('selectedTask', null);
    Session.set('editTask', null);

    Template.boxes.tasks = function() {
        return Tasks.find({active: true}, {sort: {"created": -1}});
    };

    Template.inactiveBoxes.tasks = function() {
        return Tasks.find({active: false}, {sort: {"created": -1}});
    };

    Template.box.selected = function() {
        return Session.equals('selectedTask', this._id) ? 'selected' : '';
    };

    Template.box.editing = function() {
        return Session.equals('editTask', this._id) ? 'editing' : '';
    };

    function popTask(id) {
        Tasks.update({_id: id}, {$set: {
            created: (new Date()).toGMTString(),
            active: false
        }});
    }

    Template.boxes.events({
        'makeSelected .box, mouseenter .box': function(e) {
            if (!Session.equals('selectedTask', this._id) &&
                Session.equals('editTask', null)) {
                Session.set('selectedTask', this._id);
            }
        },
        'keydown div.text, click div.text': function(e) {
            if (e && e.type != 'click' && e.keyCode != 13) return;
            Session.set('editTask', this._id);
        },
        'keydown .edit, blur .edit': function(e) {
            if (e.type == 'keydown') {
                if (e.keyCode == 27) { // esc
                    Session.set('editTask', null);
                    return;
                }
                if (e.keyCode != 13) { // not enter
                    return;
                }
            }

            var newText = $(e.target).val();
            if (!newText && !this.text) {
                Tasks.remove({_id: this._id});
            } else {
                Tasks.update({_id: this._id}, {$set: {text: newText}}); //TODO - error
            }
            Session.set('editTask', null);
        },
        'click a.pop': function(e) {
            e.preventDefault();
            popTask(this._id);
        }
    });

    Template.inactiveBoxes.events({
        'click a.pop': function(e) {
            e.preventDefault();
            Tasks.remove({_id: this._id});
        }
    });

    function numberBoxes() {
        var $boxes = this.findAll('.box'),
            len = $boxes.length;
        _.each($boxes, function(box, i) {
            $(box).find('.num').text(len - i);
        });
    }

    Template.boxes.rendered = function() {
        var editing = this.find('.editing');
        if (editing) {
            $(editing).find('.edit').focus().select();
        }
        numberBoxes.call(this);
    };

    Template.inactiveBoxes.rendered = numberBoxes;

    //
    // Help Modal
    //
    Session.set('showHelpModal', false);

    Template.helpModal.show = function() {
        return Session.get('showHelpModal');
    };


    //
    // Global Key Events
    //
    Meteor.startup(function() {

        function next(reverse) {
            //TODO - a reactive way to do this?
            //       or at least to trigger makeSelected
            var $tasks = $('#tasks'),
                $selected = $tasks.find('.selected'),
                $new = ($selected.length ?
                        $selected[reverse?'prev':'next']('.box') :
                        null);
            if (!$new || !$new.size()) {
                $new = $tasks.find('.box')[reverse?'last':'first']();
            }
            Session.set('selectedTask', $new.data('id'));
        };

        // key events
        var keyevents = [
            {
                evt: 'keyup',
                key: 'a',
                fn: function(e) {
                    // note - there's a mysterious bug where
                    // this gets triggered sometimes on firefox
                    // on mac osx when using cmd+tab to switch
                    // applications...
                    addTask();
                },
                help: 'Add a new task'
            },
            {
                evt: 'keypress',
                key: 'j',
                fn: function() { next(); },
                help: 'Select the next task'
            },
            {
                evt: 'keypress',
                key: 'k',
                fn: function() { next(true); },
                help: 'Select the previous task'
            },
            {
                evt: 'keyup',
                key: 'e',
                fn: function() {
                    if (!Session.equals('selectedTask', null)) {
                        Session.set('editTask', Session.get('selectedTask'));
                    }
                },
                help: 'Edit the selected task'
            },
            {
                evt: 'keyup',
                key: '#',
                fn: function() {
                    if (!Session.equals('selectedTask', null)) {
                        var id = Session.get('selectedTask');
                        next();
                        popTask(id);
                    }
                },
                help: 'Mark the current task as complete'
            },
            {
                evt: 'keyup',
                key: '?',
                exactKey: 'shift+/',
                fn: function() {
                    Session.set('showHelpModal', true);
                },
                help: 'Show the help modal'
            }
        ];

        var $doc = $(document);

        _.each(keyevents, function(obj) {
            $doc.bind(obj.evt, obj.exactKey || obj.key, obj.fn);
        });

        $doc.bind('keyup', 'esc', function() {
            Session.set('showHelpModal', false);
        });
    });
}

if (Meteor.isServer) {
    Meteor.startup(function() {
        // code to run on server at startup
    });
}
