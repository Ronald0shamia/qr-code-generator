jQuery(function ($) {
    $('.qrg-tab').not('.active').hide();

    $('.nav-tab').on('click', function (event) {
        event.preventDefault();

        const target = $(this).attr('href');

        $('.nav-tab').removeClass('nav-tab-active');
        $(this).addClass('nav-tab-active');

        $('.qrg-tab').removeClass('active').hide();
        $(target).addClass('active').show();

        if (target === '#tab-preview') {
            loadPreview();
        }
    });

    function loadPreview() {
        const preview = $('#qrg-preview-container');
        preview.html('<em>Vorschau wird geladen...</em>');

        $.post(qrg_ajax.ajax_url, {
            action: 'qrg_preview',
            nonce: qrg_ajax.nonce
        }).done(function (response) {
            if (!response.success) {
                preview.html('<strong>Fehler beim Laden.</strong>');
                return;
            }

            preview.html(response.data);

            if (window.qrgInitGenerators) {
                window.qrgInitGenerators(preview[0]);
            }
        }).fail(function () {
            preview.html('<strong>Fehler beim Laden.</strong>');
        });
    }
});
