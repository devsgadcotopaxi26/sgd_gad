from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import ConfiguracionSistema
from .serializers import ConfiguracionSistemaSerializer


class ConfiguracionSistemaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = ConfiguracionSistema.get()
        return Response(ConfiguracionSistemaSerializer(config).data)

    def patch(self, request):
        config = ConfiguracionSistema.get()
        serializer = ConfiguracionSistemaSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(modificado_por=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.core.mail import send_mail
        destinatario = request.data.get('email', request.user.email)
        try:
            send_mail(
                subject='Prueba de correo — SGD GAD Cotopaxi',
                message='Este es un correo de prueba del Sistema de Gestión Documental del GAD Provincial de Cotopaxi. Si recibes este mensaje, la configuración SMTP está funcionando correctamente.',
                from_email='SGD GAD Cotopaxi <sgd@cotopaxi.gob.ec>',
                recipient_list=[destinatario],
                fail_silently=False,
            )
            return Response({'detail': f'Correo de prueba enviado a {destinatario}'})
        except Exception as e:
            return Response({'detail': f'Error: {str(e)}'}, status=500)