from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notificacion


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

    def get_serializer_class(self):
        from .serializers import NotificacionSerializer
        return NotificacionSerializer

    @action(detail=False, methods=['get'], url_path='no_leidas')
    def no_leidas(self, request):
        from .serializers import NotificacionSerializer
        qs = self.get_queryset().filter(leido=False)[:20]
        return Response({
            'count':         self.get_queryset().filter(leido=False).count(),
            'notificaciones': NotificacionSerializer(qs, many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='marcar_leida')
    def marcar_leida(self, request, pk=None):
        n = self.get_object()
        n.leido    = True
        n.leido_en = timezone.now()
        n.estado   = 'leido'
        n.save()
        return Response({'detail': 'Notificación marcada como leída.'})

    @action(detail=False, methods=['post'], url_path='marcar_todas_leidas')
    def marcar_todas_leidas(self, request):
        self.get_queryset().filter(leido=False).update(
            leido=True, leido_en=timezone.now(), estado='leido'
        )
        return Response({'detail': 'Todas las notificaciones marcadas como leídas.'})