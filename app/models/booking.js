define([
    'can/util/string',
    'moment',
    'underscore',
    'models/travellers',
    'utils',
    'can/model',
    'can/map/validations',
    'can/map/attributes',
    'can/compute'
], function(can, moment, _, Traveller ){
    'use strict';

    return can.Model({
        findOne : 'GET property/booking/{bookingId}',
        create  : 'POST property/booking/create',
        update  : 'POST property/booking/{bookingId}',

        defaults: {
            webExtras: []
        },

        attributes: {
            partyDetails: Traveller.List,
            fromDate: 'date',
            toDate: 'date'
        },

        convert: {
            'date': function( raw ) {
                if( typeof raw === 'number' ) {
                    return moment( raw * 1000 );
                } else if( typeof raw === 'string' ) {
                    return moment( raw, 'YYYY-MM-DD' );
                }
                return raw;
            }
        },

        'serialize': {
            date: function( val ) {
                if( val ) {
                    return val.format('YYYY-MM-DD');
                }
            }
        },

        model: function( rawData ) {
            return can.Model.model.call( this, can.extend( rawData, {
                'propRef': rawData.propertyRef + '_' + rawData.brandCode
            }));
        },

        required: [
            // this are required to make a booking
            'propRef',
            'fromDate',
            'toDate',
            'adults',
            'children',
            'infants',
            'pets',
            // these are required to complete a booking
            'customer.name.title',
            'customer.name.firstName',
            'customer.name.surname',
            'customer.address.addr1',
            'customer.address.addr2',
            'customer.address.town',
            'customer.address.county',
            'customer.address.postcode',
            'customer.address.country',
            'customer.daytimePhone',
            'customer.eveningPhone',
            'customer.mobilePhone',
            'customer.email',
            'customer.emailOptIn',
            'customer.source',
            'customer.which'
        ],

        'init': function() {
            this.validatePresenceOf( this.required,{
                'message': 'The {label} field is required'
            });

            this.validate(['adults', 'children', 'infants'], function() {
                if( this.attr('partySize') > this.attr('propertyData.sleeps') ) {
                    return 'The party size exceeds the maximum size this property can accommodate';
                }
            });

            this.validate('status', function( status ) {
                if( status && status !== 'ok' ) {
                    return this.attr('message') || 'An unknown error occurred';
                }
            });
        }

    }, {

        'init': function() {
            this.on( 'partySize', can.proxy( this.partyChangeHandler, this ) );
        },

        'partyChangeHandler': function() {
            var mutate = {};

            can.trigger( this, 'partyDetailsUpdating' );

            // Why not set a default in the model?
            if( !this.attr('partyDetails') ) {
                this.attr('partyDetails', []);
            }

            can.each( _.pick( this, _.keys( Traveller.types ) ), function( value, key ) {
                mutate[ Traveller.types[key] ] = parseInt( value, 10 );
            });

            this.attr('partyDetails').mutate( mutate );
            can.trigger( this, 'partyDetailsUpdated' );
        },

        'destroy': function() {
            this.off('partySize');

            return can.Model.prototype.destroy.call( this );
        },

        'fetchBooking': function( fetch ) {

            var self = this;
            // If we pass anything we can expect the deferred object to be returned, so we can attach done methods
            if( fetch ) {

                switch( typeof fetch ) {
                case 'string':

                    this.attr('bookingId', fetch);

                    return this.constructor.findOne({
                        'bookingId': fetch
                    }).done(function( booking ) {
                        //self.attr( booking.__get() ); Why did i do this
                        // The following call does mean that we instantiate and throw away stuff ( like travellers )
                        self.attr(booking.attr(), true);
                    });

                    //break;
                case 'object':
                    this.attr( fetch );
                    return this.save();//.done(function () {});
                }

            } else {
                return this;
            }
        },

        'reset': function() {
            var self = this;
            this.each(function ( value, key ) {
                self.removeAttr(key);
            });
        },

        'partySize': can.compute(function() {
            // TODO: use the Traveller.types static object keys
            return this.attr('adults') + this.attr('children') + this.attr('infants');
        }),

        // In most cases we need to clear this error before continuing
        // So we just remove it
        'clearServerError': function() {
            this.removeAttr('status');
        }

    });

});