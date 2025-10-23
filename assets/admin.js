jQuery(document).ready(function($) {
    // Tabs umschalten
    $('.nav-tab').on('click', function(e) {
        e.preventDefault();
        $('.nav-tab').removeClass('nav-tab-active');
        $(this).addClass('nav-tab-active');

        const target = $(this).attr('href');
        $('.qrg-tab').removeClass('active').hide();
        $(target).addClass('active').show();

        if (target === '#tab-preview') {
            loadPreview();
        }
    });

    function loadPreview() {
        $('#qrg-preview-container').html('<em>Vorschau wird geladen...</em>');
        $.post(qrg_ajax.ajax_url, { action: 'qrg_preview' }, function(response) {
            if (response.success) {
                $('#qrg-preview-container').html(response.data);
            } else {
                $('#qrg-preview-container').html('<strong>Fehler beim Laden!</strong>');
            }
        });
    }
});
