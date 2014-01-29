define([
    'can/util/string',
    './views',
    'resources/book',
    'models/payment',
    // extras
    'spinner',
    'can/control',
    'can/control/plugin',
    'controls/form/form'
], function( can, views, booking, Payment ) {
    'use strict';
    
    return can.Control({
        defaults: {
            booking: booking,
            payment: null,
            canPayLater: true,
            canDeposit: true,
            depositChoices: [
                ['balance', 'Pay the full amount'],
                ['deposit', 'Pay by deposit']
            ]
        }
    }, {
        init: function() {
            this.options.payment = new Payment({
                id: this.options.booking.attr('bookingId'),
                'payLater': false,
                // balance: pay the full amount
                // deposit: just pay the deposit
                'paymentType': 'balance'
            });
            this.options.depositChoices = new can.List( this.options.depositChoices );

            this.element.html( views.init({
                payment:        this.options.payment,
                options:        this.options,
                choices:        this.options.depositChoices,
                canPayLater:    this.options.canPayLater
            }) );

            this.updatePayment();

            this.on();
        },

        updatePayment: function() {
            var $holder = this.element.find('.iframe-holder');

            $holder
                .spin()
                .find('> iframe')
                    .remove();

            this.options.booking.save().done(can.proxy(function() {
                this.options.payment
                    .reset()
                    .save()
                        .done(function() {
                            $holder.spin(false);
                        });

            }, this));
        },

        'iframe load': function() {
            console.log('and again');
        },

        '{booking} bookingId': function( model, newVal ) {
            if( newVal !== this.options.payment.attr('id') ) {
                this.options.payment.attr( 'id', newVal );
                this.updatePayment();
            }
        },

        '.pay-later click': function() {
            // TODO
            alert('I haven\'t implemented this yet');
        },

        '{payment} paymentType': function() {
            this.updatePayment();
        },

        '{window} message': function( win, evt ) {
            var message = JSON.parse( evt.originalEvent.data );

            if( message.status === 'ok' ) {
                // Re fetch the booking, at which point the app should react
                this.options.booking.save();
            }
        },

    });

});