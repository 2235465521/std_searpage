from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    ViewStdFull, StdBase, StdGbDetail, StdHbDetail, 
    StdDbDetail, StdTbDetail, StdReplace, StdPedigree, StdPedChain
)

class StdPedChainSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdPedChain
        fields = '__all__'

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        role = "superadmin" if user.is_superuser else "user"
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "token": data.get("access"),
                "refresh": data.get("refresh"),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "status": user.status,
                    "role": role
                }
            }
        }

class ViewStdFullSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViewStdFull
        fields = '__all__'

class StdBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdBase
        fields = '__all__'

class StdGbDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdGbDetail
        fields = '__all__'

class StdHbDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdHbDetail
        fields = '__all__'

class StdDbDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdDbDetail
        fields = '__all__'

class StdTbDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdTbDetail
        fields = '__all__'

class StdPedigreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdPedigree
        fields = '__all__'

class StdReplaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StdReplace
        fields = '__all__'
