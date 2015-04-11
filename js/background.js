
define([ "jquery", "date", "i18n", "apis", "vo", "files", "controlbar" ], function( $, date, i18n, apis, vo, files, controlbar ) {

    "use strict";

    function getCurrentBackground( is_random ) {

        var def = $.Deferred();

        // set background refresh
        localStorage["simptab-background-refresh"] = "false";

        // get simptab-background
        vo.Get( function( result ) {
            if ( result && !$.isEmptyObject( result )) {

                // save current background object
                vo.cur = result["simptab-background"];
                console.log( "Current background data structure is ", vo.cur );

                // check old data structure
                if ( !vo.Verify() ) {
                    console.error( "Current data structure error.", result );
                    //// set default background and call api. type 1
                    def.resolve(1);
                }
                else {
                    if ( is_random ) {
                        //// set current background and call api. type 2
                        def.resolve(2);
                    }
                    else {
                        if ( date.Today() != vo.cur.enddate ) {
                            //// set background refresh
                            localStorage["simptab-background-refresh"] = "true";
                            //// only call api. type 3
                            def.resolve(3);
                        }
                        else {
                            //// set current background and not-call api. type 4
                            def.resolve(4);
                        }
                    }
                }
            }
            else {
                //// set default background and call api. type 1
                def.resolve(1);
            }
        });

        return def.promise();
    }

    function setCurrentBackground( state ) {
        var def = $.Deferred();

        console.log( "Current state is " + state );

        switch ( state ) {
            case 1:
                controlbar.Set( true );
                //call api
                break;
            case 2:
                controlbar.Set( false );
                //call api
                break;
            case 3:
                //call api
                break;
            case 4:
                controlbar.Set( false );
                break;
        }

        def.resolve( state != 4 ? true : false );

        return def.promise();
    }

    function getRemoteBackground( is_remote ) {
        var def = $.Deferred();

        if ( is_remote ) {

            localStorage["simptab-background-state"] = "remote";

            apis.Init()
                .fail( failBackground )
                .done( function( result ) {
                    def.resolve( true, result.hdurl );
                });
        }
        else {
            def.resolve( false, null );
        }

        return def.promise();
    }

    function setRemoteBackground( is_save, url ) {
        var def = $.Deferred();

        if ( is_save ) {

            // change background-state
            localStorage["simptab-background-state"] = "loading";

            files.GetDataURI( url ).then( function( result ) {
                files.Add( vo.constructor.BACKGROUND, result )
                    .progress( function( result ) {
                        if ( result != undefined && !$.isEmptyObject( result )) {
                            switch ( result.type ) {
                                case "writestart":
                                    console.log( "Write start: ", result );
                                    localStorage["simptab-background-state"] = "writestart";
                                    break;
                                case "progress":
                                    console.log( "Write process: ", result );
                                    localStorage["simptab-background-state"] = "pending";
                                    break;
                            }
                        }
                    })
                    .done( function( result ) {
                        console.log( "Write completed: ", result );
                        localStorage["simptab-background-state"] = "success";
                        def.resolve( is_save );
                    })
                    .fail( function( result ) {
                        console.log( "Write error: ", result );
                        localStorage["simptab-background-state"] = "writefailed";
                        def.reject( null, "Favorite write to local error.", result );
                    });
            }, function( error ) {
                def.reject( null, "Load background error.", error );
            });
        }
        else {
            def.resolve( is_save );
        }

        return def.promise();
    }

    function successBackground( is_save ) {

        console.log( "===== New background get success. =====" );

        if ( is_save ) {
            // when 'change bing.com background everyday', re-set controlbar.Set
            if ( localStorage["simptab-background-refresh"] != undefined && localStorage["simptab-background-refresh"] == "true" ) {

                // when local storage 'simptab-background-refresh' == "true", re-set 'simptab-background-state' is 'ready'
                localStorage["simptab-background-state"] = "ready";

                // seach current bing.com background is favorite?
                vo.new.favorite = files.FindFavBing( files.FavBingVO(), vo.new.enddate );

                // update vo.cur
                vo.cur = vo.Clone( vo.new );
                controlbar.Set( false );
            }

            // sync vo
            vo.Set( vo.new );
            console.log( "======= New Background Obj is ", vo );
        }
    }

    function failBackground( error ) {
        try {
            throw error;
        }
        catch( error ) {
            console.group( "===== SimpTab failed. ====="             );
            console.error( "error             = ", error             );
            console.error( "error.name        = ", error.name        );
            console.error( "error.method_name = ", error.method_name );
            console.error( "error.message     = ", error.message     );
            console.error( "error.data        = ", error.data        );
            console.groupEnd();
        }
    }

    return {
        Get: function( is_random ) {

            // state includ: ready remote(call api) loading(image) writestart(write start) pending(writting) success(write complete, end) writefailed(write error, end) remotefailed(remote failed, end)
            localStorage["simptab-background-state"] = "ready";

            getCurrentBackground( is_random )
                .then( setCurrentBackground )
                .then( getRemoteBackground  )
                .then( setRemoteBackground, failBackground )
                .then( successBackground,   failBackground );
        },

        SetLang: function( lang ) {

            // check locales
            if ( lang != "en" && lang != "zh_CN" && lang != "zh_TW" ) {
                lang = "en";
            }

            // set font-family
            $( "body" ).css({ "font-family" : lang });
        },

        Valid: function() {
            setTimeout( function() {
                if ( $("body").css( "background-image" ) == "none" ) {
                    controlbar.Set( true );
                }
            }, 8 * 1000 );
        },

        Favorite: function( is_favorite ) {

            console.log("is_favorite = ", is_favorite);

            if ( is_favorite ) {

                var file_name = date.Now();
                files.Add( file_name, files.DataURI() )
                    .done( function() {

                        // update favorite
                        vo.cur.favorite = file_name;
                        // when vo.type is 'upload', need update hdurl and url
                        if ( vo.cur.type == "upload" ) {
                            var new_url  = vo.cur.hdurl;
                            new_url      = new_url.substring( new_url.lastIndexOf("/") + 1, new_url.lastIndexOf(".jpg") );
                            vo.cur.hdurl = vo.cur.hdurl.replace( new_url, file_name );
                            vo.cur.url   = vo.cur.hdurl;
                        }

                        // when simptab-background-state != success, need refresh vo
                        if ( localStorage[ "simptab-background-state" ] != "success" ) {
                            vo.Set( vo.cur );
                        }

                        // update local storge 'simptab-favorites'
                        files.AddFavorite( files.FavoriteVO(), file_name, vo.cur );

                        // update local storge 'simptab-bing-fav'
                        if ( vo.cur.type == "bing.com" ) files.AddFavBing( files.FavBingVO(), vo.cur.enddate + ":" + vo.cur.favorite );

                        // set favorite icon state
                        controlbar.SetFavorteIcon();

                        console.log( "Add favorite background success." );
                    })
                    .fail( function( error ) {
                        console.error( "Add favorite background error.", error );
                    });
            }
            else {
                files.Delete( vo.cur.favorite,
                    function( file_name ) {

                        console.log( "Delete favorite is ", file_name );

                        try {
                            // update local storge 'simptab-favorites'
                            files.DeleteFavorite( files.FavoriteVO(), file_name );

                            // update local storge 'simptab-bing-fav'
                            if ( vo.cur.type == "bing.com" ) files.DeleteFavBing( files.FavBingVO(), vo.cur.favorite );

                            // update vo.cur
                            vo.cur.favorite = -1;

                            // when simptab-background-state != success, need refresh vo
                            if ( localStorage[ "simptab-background-state" ] != "success" ) {
                                vo.Set( vo.cur );
                            }

                            // update favorite icon
                            controlbar.SetFavorteIcon();

                            console.log( "Delete favorite background success." );
                        }
                        catch ( error ) {
                            console.log( "Delete favorite background error.", error );
                        }
                    },
                    function( error ) {
                        console.error( "Delete favorite background error.", error );
                    }
                );
            }

        },

        Upload: function( result ) {
            var filelist = files.VerifyUploadFile( result ),
                arr      = [];
            for( var i = 0, len = filelist.length; i < len; i++ ) {
                (function( i, name ) {
                    files.GetDataURI( filelist[i], arr, i, len ).done( function( datauri ) {

                        var file_name = Math.round(+new Date()),
                            upload_vo = {new:{}};

                        files.Add( file_name, datauri )
                        .done( function( result, hdurl ) {

                            // create upload vo
                            vo.Create.apply( upload_vo, [ hdurl, hdurl, name, "#", date.Now(), name, "upload", file_name ]);

                            // update local storge 'simptab-favorites'
                            files.AddFavorite( files.FavoriteVO(), file_name, upload_vo.new );

                            console.log("Upload favorite background success.", upload_vo.new );
                        })
                        .fail( function( error ) {
                            console.error( "Upload favorite background error.", error );
                        });
                    }).fail( function( error ) {
                        console.error("Upload favorite background error.", error );
                    });
                }).bind( null, i, filelist[i].name )();
            }
        }
    };
});
